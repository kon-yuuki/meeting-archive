"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface Project {
  id: string;
  projectName: string;
  clientName: string;
}

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  status: string;
  audioFilePath: string | null;
  transcriptText: string | null;
  summaryText: string | null;
  notebooklmSynced: boolean;
  project: Project | null;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (projectId) params.set("project_id", projectId);
    if (status) params.set("status", status);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const res = await fetch(`/api/meetings?${params}`);
    const data = await res.json();
    setMeetings(data);
    setLoading(false);
  }, [keyword, projectId, status, dateFrom, dateTo]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">会議一覧</h1>
        <Link
          href="/meetings/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + 会議を登録
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <input
            type="text"
            placeholder="キーワード検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm col-span-2"
          />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          >
            <option value="">全案件</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          >
            <option value="">全ステータス</option>
            <option value="uploaded">アップロード済</option>
            <option value="queued_for_transcription">文字起こし待ち</option>
            <option value="transcribing">文字起こし中</option>
            <option value="transcribed">文字起こし済</option>
            <option value="queued_for_summary">要約待ち</option>
            <option value="summarizing">要約中</option>
            <option value="completed">完了</option>
            <option value="error">エラー</option>
          </select>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400 text-sm">〜</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={fetchMeetings}
            className="bg-gray-800 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-700"
          >
            検索
          </button>
          <button
            onClick={() => {
              setKeyword("");
              setProjectId("");
              setStatus("");
              setDateFrom("");
              setDateTo("");
            }}
            className="text-gray-500 text-sm hover:text-gray-700"
          >
            クリア
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">会議が見つかりません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">会議日</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">案件名</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">クライアント</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">タイトル</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">録音</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">文字起こし</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">要約</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">NB</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meetings.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(m.meetingDate).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {m.project?.projectName ?? <span className="text-gray-400">未分類</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.project?.clientName ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/meetings/${m.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center">{m.audioFilePath ? "✓" : "-"}</td>
                  <td className="px-3 py-3 text-center">{m.transcriptText ? "✓" : "-"}</td>
                  <td className="px-3 py-3 text-center">{m.summaryText ? "✓" : "-"}</td>
                  <td className="px-3 py-3 text-center">{m.notebooklmSynced ? "✓" : "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
