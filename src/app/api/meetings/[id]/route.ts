import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresignedUrl } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      project: true,
      meetingActions: { orderBy: { createdAt: "asc" } },
      processingLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Generate presigned URL for audio if available
  let audioUrl: string | null = null;
  if (meeting.audioFilePath) {
    try {
      audioUrl = await getPresignedUrl(meeting.audioFilePath);
    } catch {
      // Storage not available, skip
    }
  }

  return NextResponse.json({ ...meeting, audioUrl });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const {
    projectId,
    title,
    meetingDate,
    participantText,
    notebooklmSynced,
  } = body;

  const meeting = await prisma.meeting.update({
    where: { id },
    data: {
      ...(projectId !== undefined && { projectId }),
      ...(title && { title }),
      ...(meetingDate && { meetingDate: new Date(meetingDate) }),
      ...(participantText !== undefined && { participantText }),
      ...(notebooklmSynced !== undefined && {
        notebooklmSynced,
        notebooklmSyncedAt: notebooklmSynced ? new Date() : null,
      }),
    },
    include: { project: true },
  });
  return NextResponse.json(meeting);
}
