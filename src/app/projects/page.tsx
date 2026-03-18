"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  status: string;
  notebooklmUrl: string | null;
  _count: { meetings: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectCode: "", projectName: "", clientName: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchProjectsData = useCallback(async () => {
    const res = await fetch("/api/projects");
    return res.json();
  }, []);

  const fetchProjects = useCallback(async () => {
    const data = await fetchProjectsData();
    setProjects(data);
    setLoading(false);
  }, [fetchProjectsData]);

  useEffect(() => {
    let active = true;

    const loadProjects = async () => {
      const data = await fetchProjectsData();
      if (active) {
        setProjects(data);
        setLoading(false);
      }
    };

    void loadProjects();

    return () => {
      active = false;
    };
  }, [fetchProjectsData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ projectCode: "", projectName: "", clientName: "" });
    setShowForm(false);
    setSubmitting(false);
    await fetchProjects();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">案件一覧</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + 案件を作成
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-lg border border-gray-200 p-5 mb-6"
        >
          <h2 className="font-semibold text-gray-800 mb-4">新規案件作成</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                案件コード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.projectCode}
                onChange={(e) => setForm({ ...form, projectCode: e.target.value })}
                placeholder="PJ-001"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                案件名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                placeholder="〇〇採用サイトリニューアル"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                クライアント名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="〇〇株式会社"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              作成
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-600 text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">案件がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">案件コード</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">案件名</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">クライアント</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">会議数</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">NotebookLM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-600">{p.projectCode}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {p.projectName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.clientName}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{p._count.meetings}</td>
                  <td className="px-4 py-3 text-center">
                    {p.notebooklmUrl ? (
                      <a
                        href={p.notebooklmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        開く ↗
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">未設定</span>
                    )}
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
