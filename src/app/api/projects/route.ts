import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { meetings: true } },
    },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectCode, projectName, clientName, notebooklmUrl } = body;

  if (!projectCode || !projectName || !clientName) {
    return NextResponse.json(
      { error: "projectCode, projectName, clientName are required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: { projectCode, projectName, clientName, notebooklmUrl },
  });
  return NextResponse.json(project, { status: 201 });
}
