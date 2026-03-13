/**
 * Zoom Webhook エンドポイント
 *
 * セットアップ手順（Zoom管理画面）:
 * 1. Zoom Marketplace → Build App → Webhook Only App (または Server-to-Server OAuth)
 * 2. Feature → Event Subscriptions → Add new event subscription
 *    - Subscription URL: https://your-app.vercel.app/api/webhooks/zoom
 *    - Event types: Recording → All Recordings have been completed (recording.completed)
 * 3. Secret Token をコピーして ZOOM_WEBHOOK_SECRET_TOKEN に設定
 * 4. 録音ダウンロードに Server-to-Server OAuth App が必要:
 *    ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET を設定
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadFile, audioStoragePath } from "@/lib/storage";
import {
  getZoomAccessToken,
  downloadZoomRecording,
  type ZoomWebhookPayload,
  type ZoomRecordingFile,
} from "@/lib/zoom";

function verifyZoomWebhook(
  req: NextRequest,
  body: string
): boolean {
  const timestamp = req.headers.get("x-zm-request-timestamp");
  const signature = req.headers.get("x-zm-signature");
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

  if (!timestamp || !signature || !secret) return false;

  // Zoom HMAC-SHA256 signature verification
  const message = `v0:${timestamp}:${body}`;
  const expected = `v0=${crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Pick the best audio file from recording files
function selectAudioFile(files: ZoomRecordingFile[]): ZoomRecordingFile | null {
  // Priority: M4A audio > MP4 (shared screen + audio)
  const priority = ["M4A", "MP4"];
  for (const ext of priority) {
    const f = files.find(
      (f) =>
        f.file_extension?.toUpperCase() === ext &&
        f.status === "completed" &&
        f.recording_type !== "chat_file"
    );
    if (f) return f;
  }
  return files.find((f) => f.status === "completed") ?? null;
}

async function matchProject(topic: string): Promise<string | null> {
  // Try to match project from meeting topic e.g. 【PJ-001】...
  const codeMatch = topic.match(/【([^】]+)】/);
  if (codeMatch) {
    const project = await prisma.project.findUnique({
      where: { projectCode: codeMatch[1] },
    });
    if (project) return project.id;
  }

  // Fallback: find project by client name in topic
  const projects = await prisma.project.findMany({
    where: { status: "active" },
    select: { id: true, clientName: true, projectName: true },
  });
  for (const p of projects) {
    if (
      topic.includes(p.clientName) ||
      topic.includes(p.projectName)
    ) {
      return p.id;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Zoom URL validation challenge (first-time setup)
  let parsed: ZoomWebhookPayload & { payload?: { plainToken?: string } };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (parsed.event === "endpoint.url_validation") {
    const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN!;
    const plainToken = (parsed.payload as { plainToken: string }).plainToken;
    const encryptedToken = crypto
      .createHmac("sha256", secret)
      .update(plainToken)
      .digest("hex");
    return NextResponse.json({ plainToken, encryptedToken });
  }

  // Verify signature for all other events
  if (!verifyZoomWebhook(req, body)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (parsed.event !== "recording.completed") {
    return NextResponse.json({ received: true });
  }

  const zoomMeeting = parsed.payload.object;
  const { id: zoomMeetingId, topic, start_time, host_email, recording_files } = zoomMeeting;

  const audioFile = selectAudioFile(recording_files ?? []);
  if (!audioFile) {
    console.log(`[zoom-webhook] No audio file found for meeting: ${zoomMeetingId}`);
    return NextResponse.json({ received: true });
  }

  // Idempotency: skip if already imported
  const existing = await prisma.meeting.findFirst({
    where: { zoomMeetingId: String(zoomMeetingId) },
  });
  if (existing) {
    console.log(`[zoom-webhook] Meeting already imported: ${zoomMeetingId}`);
    return NextResponse.json({ received: true, skipped: true });
  }

  const projectId = await matchProject(topic);

  // Create meeting record
  const meeting = await prisma.meeting.create({
    data: {
      zoomMeetingId: String(zoomMeetingId),
      projectId,
      title: topic,
      meetingDate: new Date(start_time),
      hostName: host_email,
      status: "uploaded",
    },
  });

  await prisma.processingLog.create({
    data: {
      meetingId: meeting.id,
      processType: "zoom_webhook",
      result: "received",
      message: `Recording completed. File: ${audioFile.file_extension} (${Math.round(audioFile.file_size / 1024 / 1024)}MB)`,
    },
  });

  // Download and upload audio in background (don't block webhook response)
  (async () => {
    try {
      const accessToken = await getZoomAccessToken();
      const audioBuffer = await downloadZoomRecording(
        audioFile.download_url,
        accessToken
      );

      const filename = `zoom-${zoomMeetingId}.${audioFile.file_extension.toLowerCase()}`;
      const storagePath = audioStoragePath(
        projectId ?? "unassigned",
        meeting.id,
        filename
      );
      await uploadFile(storagePath, audioBuffer, `audio/${audioFile.file_extension.toLowerCase()}`);

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          audioFilePath: storagePath,
          status: "queued_for_transcription",
        },
      });

      await prisma.processingLog.create({
        data: {
          meetingId: meeting.id,
          processType: "zoom_download",
          result: "success",
          message: `Downloaded and uploaded to storage: ${storagePath}`,
        },
      });

      console.log(`[zoom-webhook] Meeting queued for transcription: ${meeting.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[zoom-webhook] Download failed for ${meeting.id}: ${message}`);
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: "error", errorMessage: `Zoom download failed: ${message}` },
      });
      await prisma.processingLog.create({
        data: {
          meetingId: meeting.id,
          processType: "zoom_download",
          result: "error",
          message,
        },
      });
    }
  })();

  return NextResponse.json({ received: true, meetingId: meeting.id });
}
