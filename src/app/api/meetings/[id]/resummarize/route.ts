import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!meeting.transcriptText) {
    return NextResponse.json(
      { error: "No transcript available for summarization" },
      { status: 400 }
    );
  }

  await prisma.meeting.update({
    where: { id },
    data: {
      status: "queued_for_summary",
      errorMessage: null,
      summaryText: null,
      summaryJson: undefined,
    },
  });

  await prisma.processingLog.create({
    data: {
      meetingId: id,
      processType: "resummarize",
      result: "queued",
      message: "Re-summarization queued",
    },
  });

  return NextResponse.json({ success: true, status: "queued_for_summary" });
}
