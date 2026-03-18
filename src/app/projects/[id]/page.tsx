"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  status: string;
  notebooklmSynced: boolean;
  notebooklmSyncedAt: string | null;
}

interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  status: string;
  notebooklmUrl: string | null;
  meetings: Meeting[];
}

interface NotebooklmStatus {
  synced: Meeting[];
  unsynced: Meeting[];
  lastSyncedAt: string | null;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [nbStatus, setNbStatus] = useState<NotebooklmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ notebooklmUrl: "" });
  const [nbProcessing, setNbProcessing] = useState(false);
  const [selectedUnsynced, setSelectedUnsynced] = useState<Set<string>>(new Set());

  const fetchProjectData = useCallback(async () => {
    const [projRes, nbRes] = await Promise.all([
      fetch(`/api/projects/${id}`),
      fetch(`/api/projects/${id}/notebooklm`),
    ]);
    return {
      project: await projRes.json(),
      notebooklm: await nbRes.json(),
    };
  }, [id]);

  const fetchProject = useCallback(async () => {
    const data = await fetchProjectData();
    setProject(data.project);
    setNbStatus(data.notebooklm);
    setForm({ notebooklmUrl: data.project.notebooklmUrl ?? "" });
    setLoading(false);
  }, [fetchProjectData]);

  useEffect(() => {
    let active = true;

    const loadProject = async () => {
      const data = await fetchProjectData();
      if (active) {
        setProject(data.project);
        setNbStatus(data.notebooklm);
        setForm({ notebooklmUrl: data.project.notebooklmUrl ?? "" });
        setLoading(false);
      }
    };

    void loadProject();

    return () => {
      active = false;
    };
  }, [fetchProjectData]);

  const handleSave = async () => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebooklmUrl: form.notebooklmUrl || null }),
    });
    setEditing(false);
    await fetchProject();
  };

  const handleMarkSynced = async (meetingIds: string[], synced: boolean) => {
    setNbProcessing(true);
    const res = await fetch(`/api/projects/${id}/notebooklm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingIds, synced }),
    });
    const data = await res.json();
    if (data.success) {
      setSelectedUnsynced(new Set());
      await fetchProject();
    }
    setNbProcessing(false);
  };

  const toggleUnsyncedSelect = (mid: string) => {
    setSelectedUnsynced((prev) => {
      const next = new Set(prev);
      if (next.has(mid)) {
        next.delete(mid);
      } else {
        next.add(mid);
      }
      return next;
    });
  };

  if (loading) return <div className="text-center py-16 text-gray-400">読み込み中...</div>;
  if (!project) return <div className="text-center py-16 text-gray-400">案件が見つかりません</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/projects" className="text-blue-600 text-sm hover:underline">
          ← 案件一覧
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.projectName}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {project.projectCode} / {project.clientName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Project info */}
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">案件情報</h2>
            <button
              onClick={() => setEditing(!editing)}
              className="text-blue-600 text-sm hover:underline"
            >
              {editing ? "キャンセル" : "編集"}
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">案件コード</dt>
            <dd className="font-mono">{project.projectCode}</dd>
            <dt className="text-gray-500">案件名</dt>
            <dd>{project.projectName}</dd>
            <dt className="text-gray-500">クライアント</dt>
            <dd>{project.clientName}</dd>
            <dt className="text-gray-500">NotebookLM URL</dt>
            <dd>
              {editing ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.notebooklmUrl}
                    onChange={(e) => setForm({ notebooklmUrl: e.target.value })}
                    placeholder="https://notebooklm.google.com/..."
                    className="border border-gray-200 rounded px-2 py-1 text-sm flex-1"
                  />
                  <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    保存
                  </button>
                </div>
              ) : project.notebooklmUrl ? (
                <a
                  href={project.notebooklmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {project.notebooklmUrl}
                </a>
              ) : (
                <span className="text-gray-400">未設定</span>
              )}
            </dd>
          </dl>
        </section>

        {/* NotebookLM sync panel */}
        <section className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">NotebookLM 反映状況</h2>
            {nbStatus?.lastSyncedAt && (
              <span className="text-xs text-gray-400">
                最終反映: {new Date(nbStatus.lastSyncedAt).toLocaleString("ja-JP")}
              </span>
            )}
          </div>

          {!nbStatus || (nbStatus.synced.length === 0 && nbStatus.unsynced.length === 0) ? (
            <p className="text-sm text-gray-400">完了済みの会議がありません</p>
          ) : (
            <div className="space-y-4">
              {/* Unsynced */}
              {nbStatus.unsynced.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-orange-700">
                      未反映 ({nbStatus.unsynced.length}件)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setSelectedUnsynced(
                            selectedUnsynced.size === nbStatus.unsynced.length
                              ? new Set()
                              : new Set(nbStatus.unsynced.map((m) => m.id))
                          )
                        }
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {selectedUnsynced.size === nbStatus.unsynced.length ? "全解除" : "全選択"}
                      </button>
                      {selectedUnsynced.size > 0 && (
                        <button
                          onClick={() => handleMarkSynced([...selectedUnsynced], true)}
                          disabled={nbProcessing}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          選択した{selectedUnsynced.size}件を反映済みにする
                        </button>
                      )}
                    </div>
                  </div>
                  <table className="w-full text-xs border border-orange-100 rounded overflow-hidden">
                    <tbody className="divide-y divide-orange-50">
                      {nbStatus.unsynced.map((m) => (
                        <tr key={m.id} className="bg-orange-50">
                          <td className="px-3 py-2 w-8">
                            <input
                              type="checkbox"
                              checked={selectedUnsynced.has(m.id)}
                              onChange={() => toggleUnsyncedSelect(m.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {new Date(m.meetingDate).toLocaleDateString("ja-JP")}
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/meetings/${m.id}`} className="text-blue-600 hover:underline">
                              {m.title}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleMarkSynced([m.id], true)}
                              disabled={nbProcessing}
                              className="text-green-600 hover:underline disabled:opacity-50"
                            >
                              反映済みにする
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Synced */}
              {nbStatus.synced.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-green-700">
                      反映済み ({nbStatus.synced.length}件)
                    </h3>
                    <button
                      onClick={() =>
                        handleMarkSynced(nbStatus.synced.map((m) => m.id), false)
                      }
                      disabled={nbProcessing}
                      className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                      全て未反映に戻す
                    </button>
                  </div>
                  <table className="w-full text-xs border border-green-100 rounded overflow-hidden">
                    <tbody className="divide-y divide-green-50">
                      {nbStatus.synced.map((m) => (
                        <tr key={m.id} className="bg-green-50">
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {new Date(m.meetingDate).toLocaleDateString("ja-JP")}
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/meetings/${m.id}`} className="text-blue-600 hover:underline">
                              {m.title}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-gray-400">
                            {m.notebooklmSyncedAt
                              ? new Date(m.notebooklmSyncedAt).toLocaleString("ja-JP")
                              : ""}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleMarkSynced([m.id], false)}
                              disabled={nbProcessing}
                              className="text-gray-500 hover:underline disabled:opacity-50"
                            >
                              未反映に戻す
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* All meetings */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">全会議 ({project.meetings.length}件)</h2>
            <Link href="/meetings/new" className="text-blue-600 text-sm hover:underline">
              + 会議を登録
            </Link>
          </div>
          {project.meetings.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">会議が登録されていません</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">会議日</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">タイトル</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">NB</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(m.meetingDate).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/meetings/${m.id}`} className="text-blue-600 hover:underline">
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.notebooklmSynced ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
