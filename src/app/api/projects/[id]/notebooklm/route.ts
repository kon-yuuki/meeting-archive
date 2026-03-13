import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/projects/:id/notebooklm
// Returns NotebookLM sync status for all completed meetings in the project
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const meetings = await prisma.meeting.findMany({
    where: {
      projectId: id,
      status: "completed",
    },
    select: {
      id: true,
      title: true,
      meetingDate: true,
      notebooklmSynced: true,
      notebooklmSyncedAt: true,
      summaryText: true,
    },
    orderBy: { meetingDate: "desc" },
  });

  const synced = meetings.filter((m) => m.notebooklmSynced);
  const unsynced = meetings.filter((m) => !m.notebooklmSynced);
  const lastSyncedAt =
    synced.length > 0
      ? synced.reduce((latest, m) =>
          m.notebooklmSyncedAt && (!latest || m.notebooklmSyncedAt > latest)
            ? m.notebooklmSyncedAt
            : latest,
          null as Date | null
        )
      : null;

  return NextResponse.json({ synced, unsynced, lastSyncedAt });
}

// POST /api/projects/:id/notebooklm
// Bulk update notebooklm_synced for specified meeting IDs
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { meetingIds, synced } = body as {
    meetingIds: string[];
    synced: boolean;
  };

  if (!Array.isArray(meetingIds) || meetingIds.length === 0) {
    return NextResponse.json({ error: "meetingIds is required" }, { status: 400 });
  }

  await prisma.meeting.updateMany({
    where: { id: { in: meetingIds }, projectId: id },
    data: {
      notebooklmSynced: synced,
      notebooklmSyncedAt: synced ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, updated: meetingIds.length });
}
