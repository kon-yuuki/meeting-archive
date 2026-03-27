/**
 * 文字起こしワーカー
 *
 * 動作要件:
 *   - Python + faster-whisper または whisper.cpp が社内PCにインストール済み
 *   - TRANSCRIPTION_WORKER_ENABLED=true
 *   - DATABASE_URL が設定済み
 *
 * 実行方法:
 *   npx tsx scripts/worker/transcribe/index.ts
 */

import "dotenv/config";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const execFileAsync = promisify(execFile);
const POLL_INTERVAL_MS = 30_000;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const s3 = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  region: process.env.STORAGE_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
});

const bucket = process.env.STORAGE_BUCKET_NAME ?? "meeting-archive";
const localPythonPath = process.platform === "win32"
  ? path.join(process.cwd(), ".venv", "Scripts", "python.exe")
  : path.join(process.cwd(), ".venv", "bin", "python");
const pythonCommand = process.env.PYTHON_BIN
  ?? (fs.existsSync(localPythonPath) ? localPythonPath : "python");

async function downloadToTemp(key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const tmpFile = path.join(os.tmpdir(), `audio-${Date.now()}${path.extname(key)}`);
  const stream = res.Body as NodeJS.ReadableStream;
  await new Promise<void>((resolve, reject) => {
    const ws = fs.createWriteStream(tmpFile);
    stream.pipe(ws);
    ws.on("finish", resolve);
    ws.on("error", reject);
  });
  return tmpFile;
}

async function runWhisper(audioPath: string): Promise<string> {
  // Run a small local wrapper so we don't rely on a package CLI that may not exist.
  const { stdout } = await execFileAsync(
    pythonCommand,
    [path.join(process.cwd(), "scripts/worker/transcribe/run_faster_whisper.py"), audioPath],
    {
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    }
  );

  const jsonLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"))
    .at(-1);

  if (!jsonLine) {
    throw new Error(`Transcription output did not contain JSON: ${stdout.slice(0, 300)}`);
  }

  const parsed = JSON.parse(jsonLine) as { text?: string };
  return parsed.text?.trim() ?? "";
}

async function uploadTranscript(
  key: string,
  content: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(content, "utf-8"),
      ContentType: "text/plain; charset=utf-8",
    })
  );
}

async function processOne() {
  const meeting = await prisma.meeting.findFirst({
    where: { status: "queued_for_transcription" },
    orderBy: { createdAt: "asc" },
  });

  if (!meeting) return;

  console.log(`[transcribe] Processing meeting: ${meeting.id} - ${meeting.title}`);

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "transcribing" },
  });

  let tmpAudio: string | null = null;

  try {
    if (!meeting.audioFilePath) throw new Error("No audio file path");

    tmpAudio = await downloadToTemp(meeting.audioFilePath);
    const transcriptText = await runWhisper(tmpAudio);

    // Upload raw transcript to storage
    const rawKey = meeting.audioFilePath.replace(/audio\//, "transcript/").replace(/\.[^.]+$/, ".txt");
    await uploadTranscript(rawKey, transcriptText);

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "transcribed",
        transcriptText,
        transcriptRawPath: rawKey,
        errorMessage: null,
      },
    });

    await prisma.processingLog.create({
      data: {
        meetingId: meeting.id,
        processType: "transcription",
        result: "success",
        message: `Transcribed ${transcriptText.length} chars`,
      },
    });

    console.log(`[transcribe] Done: ${meeting.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[transcribe] Error: ${meeting.id} - ${message}`);

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: "error", errorMessage: message },
    });

    await prisma.processingLog.create({
      data: {
        meetingId: meeting.id,
        processType: "transcription",
        result: "error",
        message,
      },
    });
  } finally {
    if (tmpAudio && fs.existsSync(tmpAudio)) fs.unlinkSync(tmpAudio);
  }
}

async function main() {
  if (process.env.TRANSCRIPTION_WORKER_ENABLED !== "true") {
    console.log("[transcribe] Worker disabled. Set TRANSCRIPTION_WORKER_ENABLED=true");
    process.exit(0);
  }

  console.log("[transcribe] Worker started. Polling every", POLL_INTERVAL_MS / 1000, "s");
  console.log("[transcribe] Python:", pythonCommand);

  while (true) {
    await processOne().catch(console.error);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main();
