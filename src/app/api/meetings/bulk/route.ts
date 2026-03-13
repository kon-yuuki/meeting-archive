import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/meetings/bulk
// Bulk reprocess meetings (retranscribe or resummarize)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { meetingIds, action } = body as {
    meetingIds: string[];
    action: "retranscribe" | "resummarize";
  };

  if (!Array.isArray(meetingIds) || meetingIds.length === 0) {
    return NextResponse.json({ error: "meetingIds is required" }, { status: 400 });
  }
  if (action !== "retranscribe" && action !== "resummarize") {
    return NextResponse.json({ error: "action must be retranscribe or resummarize" }, { status: 400 });
  }

  const meetings = await prisma.meeting.findMany({
    where: { id: { in: meetingIds } },
    select: { id: true, audioFilePath: true, transcriptText: true, status: true },
  });

  const eligible: string[] = [];
  const skipped: string[] = [];

  for (const m of meetings) {
    if (action === "retranscribe" && m.audioFilePath) {
      eligible.push(m.id);
    } else if (action === "resummarize" && m.transcriptText) {
      eligible.push(m.id);
    } else {
      skipped.push(m.id);
    }
  }

  if (eligible.length > 0) {
    const nextStatus =
      action === "retranscribe" ? "queued_for_transcription" : "queued_for_summary";

    await prisma.meeting.updateMany({
      where: { id: { in: eligible } },
      data: {
        status: nextStatus,
        errorMessage: null,
        ...(action === "retranscribe" && {
          transcriptText: null,
          transcriptRawPath: null,
          summaryText: null,
          summaryJson: undefined,
        }),
        ...(action === "resummarize" && {
          summaryText: null,
          summaryJson: undefined,
        }),
      },
    });

    await prisma.processingLog.createMany({
      data: eligible.map((meetingId) => ({
        meetingId,
        processType: action === "retranscribe" ? "retranscribe" : "resummarize",
        result: "queued",
        message: `Bulk ${action} queued`,
      })),
    });
  }

  return NextResponse.json({ success: true, queued: eligible.length, skipped: skipped.length });
}
