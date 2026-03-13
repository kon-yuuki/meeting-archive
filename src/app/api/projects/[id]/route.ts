import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      meetings: {
        orderBy: { meetingDate: "desc" },
        select: {
          id: true,
          title: true,
          meetingDate: true,
          status: true,
          notebooklmSynced: true,
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { projectCode, projectName, clientName, status, notebooklmUrl } = body;

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(projectCode && { projectCode }),
      ...(projectName && { projectName }),
      ...(clientName && { clientName }),
      ...(status && { status }),
      ...(notebooklmUrl !== undefined && { notebooklmUrl }),
    },
  });
  return NextResponse.json(project);
}
