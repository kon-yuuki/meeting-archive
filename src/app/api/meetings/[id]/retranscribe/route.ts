import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!meeting.audioFilePath) {
    return NextResponse.json(
      { error: "No audio file available for transcription" },
      { status: 400 }
    );
  }

  await prisma.meeting.update({
    where: { id },
    data: {
      status: "queued_for_transcription",
      errorMessage: null,
      transcriptText: null,
      transcriptRawPath: null,
    },
  });

  await prisma.processingLog.create({
    data: {
      meetingId: id,
      processType: "retranscribe",
      result: "queued",
      message: "Re-transcription queued",
    },
  });

  return NextResponse.json({ success: true, status: "queued_for_transcription" });
}
