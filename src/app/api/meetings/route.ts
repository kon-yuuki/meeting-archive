import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, audioStoragePath } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const keyword = searchParams.get("keyword");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const notebooklmSynced = searchParams.get("notebooklm_synced");

  const meetings = await prisma.meeting.findMany({
    where: {
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(notebooklmSynced !== null && {
        notebooklmSynced: notebooklmSynced === "true",
      }),
      ...(dateFrom || dateTo
        ? {
            meetingDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(keyword && {
        OR: [
          { title: { contains: keyword, mode: "insensitive" } },
          { transcriptText: { contains: keyword, mode: "insensitive" } },
          { summaryText: { contains: keyword, mode: "insensitive" } },
          {
            project: {
              OR: [
                { projectName: { contains: keyword, mode: "insensitive" } },
                { clientName: { contains: keyword, mode: "insensitive" } },
              ],
            },
          },
        ],
      }),
    },
    orderBy: { meetingDate: "desc" },
    include: {
      project: {
        select: { id: true, projectName: true, clientName: true },
      },
    },
  });

  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const projectId = formData.get("project_id") as string | null;
  const title = formData.get("title") as string;
  const meetingDate = formData.get("meeting_date") as string;
  const participantText = formData.get("participant_text") as string | null;
  const audioFile = formData.get("audio_file") as File | null;

  if (!title || !meetingDate) {
    return NextResponse.json(
      { error: "title and meeting_date are required" },
      { status: 400 }
    );
  }

  // Create meeting record first (need ID for storage path)
  const meeting = await prisma.meeting.create({
    data: {
      projectId: projectId || null,
      title,
      meetingDate: new Date(meetingDate),
      participantText: participantText || null,
      status: "uploaded",
    },
  });

  // Upload audio file if provided
  if (audioFile) {
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const storagePath = audioStoragePath(
      projectId ?? "unassigned",
      meeting.id,
      audioFile.name
    );
    await uploadFile(storagePath, buffer, audioFile.type);
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { audioFilePath: storagePath },
    });
  }

  // Auto-detect project from title if not provided
  if (!projectId && title) {
    const codeMatch = title.match(/【([^】]+)】/);
    if (codeMatch) {
      const project = await prisma.project.findUnique({
        where: { projectCode: codeMatch[1] },
      });
      if (project) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { projectId: project.id },
        });
      }
    }
  }

  const updated = await prisma.meeting.findUnique({
    where: { id: meeting.id },
    include: { project: true },
  });

  return NextResponse.json(updated, { status: 201 });
}
