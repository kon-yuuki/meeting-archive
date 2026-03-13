"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Project {
  id: string;
  projectName: string;
  clientName: string;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    projectId: "",
    title: "",
    meetingDate: new Date().toISOString().split("T")[0],
    participantText: "",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.meetingDate) {
      setError("会議タイトルと会議日は必須です");
      return;
    }

    setSubmitting(true);
    setError("");

    const formData = new FormData();
    if (form.projectId) formData.append("project_id", form.projectId);
    formData.append("title", form.title);
    formData.append("meeting_date", form.meetingDate);
    if (form.participantText) formData.append("participant_text", form.participantText);
    if (audioFile) formData.append("audio_file", audioFile);

    const res = await fetch("/api/meetings", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "登録に失敗しました");
      setSubmitting(false);
      return;
    }

    const meeting = await res.json();
    router.push(`/meetings/${meeting.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/meetings" className="text-blue-600 text-sm hover:underline">
          ← 会議一覧
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">会議を登録</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            案件
          </label>
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
          >
            <option value="">未分類（後から設定可）</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName} / {p.clientName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            会議タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="例: 【PJ-001】〇〇株式会社_定例MTG_2026-03-13"
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            命名規則: 【案件コード】クライアント名_会議種別_YYYY-MM-DD
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            会議日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.meetingDate}
            onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
            className="border border-gray-200 rounded px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            参加者
          </label>
          <textarea
            value={form.participantText}
            onChange={(e) => setForm({ ...form, participantText: e.target.value })}
            placeholder="参加者を入力（1行に1人など）"
            rows={3}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            音声ファイル
          </label>
          <input
            type="file"
            accept="audio/*,video/mp4"
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            className="block text-sm text-gray-600"
          />
          <p className="text-xs text-gray-400 mt-1">
            mp3, m4a, mp4, wav 等に対応
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "登録中..." : "登録する"}
          </button>
          <Link
            href="/meetings"
            className="text-gray-600 border border-gray-200 px-6 py-2.5 rounded-lg hover:bg-gray-50 text-sm"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
