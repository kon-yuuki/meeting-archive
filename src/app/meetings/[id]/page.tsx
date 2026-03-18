"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import type { SummaryJson } from "@/types";

interface MeetingAction {
  id: string;
  assignee: string | null;
  actionText: string;
  dueDate: string | null;
  status: string;
}

interface ProcessingLog {
  id: string;
  processType: string;
  result: string;
  message: string | null;
  createdAt: string;
}

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  hostName: string | null;
  participantText: string | null;
  audioFilePath: string | null;
  audioUrl: string | null;
  transcriptText: string | null;
  summaryText: string | null;
  summaryJson: SummaryJson | null;
  status: string;
  errorMessage: string | null;
  notebooklmSynced: boolean;
  notebooklmSyncedAt: string | null;
  project: { id: string; projectName: string; clientName: string; notebooklmUrl: string | null } | null;
  meetingActions: MeetingAction[];
  processingLogs: ProcessingLog[];
}

interface Project {
  id: string;
  projectName: string;
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const fetchMeeting = useCallback(async () => {
    const res = await fetch(`/api/meetings/${id}`);
    const data = await res.json();
    setMeeting(data);
    setSelectedProjectId(data.project?.id ?? "");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      await fetchMeeting();
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (active) {
        setProjects(data);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [fetchMeeting]);

  const handleRetranscribe = async () => {
    if (!confirm("再文字起こしを実行しますか？現在の文字起こし結果は削除されます。")) return;
    setProcessing(true);
    await fetch(`/api/meetings/${id}/retranscribe`, { method: "POST" });
    await fetchMeeting();
    setProcessing(false);
  };

  const handleResummarize = async () => {
    if (!confirm("再要約を実行しますか？現在の要約は削除されます。")) return;
    setProcessing(true);
    await fetch(`/api/meetings/${id}/resummarize`, { method: "POST" });
    await fetchMeeting();
    setProcessing(false);
  };

  const handleProjectChange = async () => {
    await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: selectedProjectId || null }),
    });
    setEditingProject(false);
    await fetchMeeting();
  };

  const handleNotebooklmToggle = async () => {
    await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebooklmSynced: !meeting?.notebooklmSynced }),
    });
    await fetchMeeting();
  };

  if (loading) return <div className="text-center py-16 text-gray-400">読み込み中...</div>;
  if (!meeting) return <div className="text-center py-16 text-gray-400">会議が見つかりません</div>;

  const summary = meeting.summaryJson;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/meetings" className="text-blue-600 text-sm hover:underline">
          ← 会議一覧
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-gray-500 text-sm">
                {new Date(meeting.meetingDate).toLocaleDateString("ja-JP")}
              </span>
              {meeting.project && (
                <span className="text-gray-500 text-sm">
                  {meeting.project.projectName} / {meeting.project.clientName}
                </span>
              )}
              <StatusBadge status={meeting.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {meeting.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-700">
          エラー: {meeting.errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Meta info */}
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">会議情報</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">会議日</dt>
            <dd>{new Date(meeting.meetingDate).toLocaleDateString("ja-JP")}</dd>
            <dt className="text-gray-500">司会・主催</dt>
            <dd>{meeting.hostName ?? "-"}</dd>
            <dt className="text-gray-500">参加者</dt>
            <dd className="whitespace-pre-wrap">{meeting.participantText ?? "-"}</dd>
            <dt className="text-gray-500">案件</dt>
            <dd>
              {editingProject ? (
                <div className="flex gap-2">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-sm"
                  >
                    <option value="">未分類</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectName}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleProjectChange}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingProject(false)}
                    className="text-gray-500 text-sm"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <span>
                  {meeting.project?.projectName ?? "未分類"}
                  <button
                    onClick={() => setEditingProject(true)}
                    className="ml-2 text-blue-600 text-xs hover:underline"
                  >
                    変更
                  </button>
                </span>
              )}
            </dd>
          </dl>
        </section>

        {/* Actions */}
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">操作</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRetranscribe}
              disabled={processing || !meeting.audioFilePath}
              className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded text-sm hover:bg-blue-100 disabled:opacity-40"
            >
              再文字起こし
            </button>
            <button
              onClick={handleResummarize}
              disabled={processing || !meeting.transcriptText}
              className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded text-sm hover:bg-purple-100 disabled:opacity-40"
            >
              再要約
            </button>
            <button
              onClick={handleNotebooklmToggle}
              className={`px-4 py-2 rounded text-sm border ${
                meeting.notebooklmSynced
                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              NotebookLM: {meeting.notebooklmSynced ? "反映済 ✓" : "未反映"}
            </button>
            {meeting.project?.notebooklmUrl && (
              <a
                href={meeting.project.notebooklmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-100"
              >
                NotebookLMを開く ↗
              </a>
            )}
          </div>
        </section>

        {/* Audio */}
        {meeting.audioUrl && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">音声</h2>
            <audio controls src={meeting.audioUrl} className="w-full" />
          </section>
        )}

        {/* Summary */}
        {summary && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">要約</h2>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">会議概要</h3>
                <p className="text-gray-600">{summary.overview}</p>
              </div>
              {summary.decisions.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">決定事項</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {summary.decisions.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}
              {summary.unresolved.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">未決事項</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {summary.unresolved.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </div>
              )}
              {summary.issues.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">課題</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {summary.issues.map((is, i) => <li key={i}>{is}</li>)}
                  </ul>
                </div>
              )}
              {summary.client_requests.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">クライアント要望</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {summary.client_requests.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
              {summary.next_actions.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">次回までの対応</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {summary.next_actions.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
              {summary.action_items.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">担当者別アクション</h3>
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">担当者</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">タスク</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">期限</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {summary.action_items.map((a, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{a.assignee}</td>
                          <td className="px-3 py-2">{a.action}</td>
                          <td className="px-3 py-2 text-gray-500">{a.due_date ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Transcript */}
        {meeting.transcriptText && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">文字起こし</h2>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {meeting.transcriptText}
            </pre>
          </section>
        )}

        {/* Processing logs */}
        {meeting.processingLogs.length > 0 && (
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">処理ログ</h2>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">日時</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">種別</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">結果</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">メッセージ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {meeting.processingLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-3 py-2">{log.processType}</td>
                    <td className="px-3 py-2">
                      <span className={log.result === "error" ? "text-red-600" : "text-green-600"}>
                        {log.result}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
