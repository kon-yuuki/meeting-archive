-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "project_code" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notebooklm_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "zoom_meeting_id" TEXT,
    "title" TEXT NOT NULL,
    "meeting_date" TIMESTAMP(3) NOT NULL,
    "host_name" TEXT,
    "participant_text" TEXT,
    "audio_file_path" TEXT,
    "transcript_raw_path" TEXT,
    "transcript_text" TEXT,
    "summary_text" TEXT,
    "summary_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "error_message" TEXT,
    "notebooklm_synced" BOOLEAN NOT NULL DEFAULT false,
    "notebooklm_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_actions" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "assignee" TEXT,
    "action_text" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_logs" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "process_type" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "projects_project_code_key" ON "projects"("project_code");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_actions" ADD CONSTRAINT "meeting_actions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_logs" ADD CONSTRAINT "processing_logs_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
