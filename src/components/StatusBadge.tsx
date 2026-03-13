import type { MeetingStatus } from "@/types";

const statusConfig: Record<
  MeetingStatus,
  { label: string; className: string }
> = {
  uploaded: { label: "アップロード済", className: "bg-gray-100 text-gray-700" },
  queued_for_transcription: { label: "文字起こし待ち", className: "bg-yellow-100 text-yellow-700" },
  transcribing: { label: "文字起こし中", className: "bg-blue-100 text-blue-700" },
  transcribed: { label: "文字起こし済", className: "bg-cyan-100 text-cyan-700" },
  queued_for_summary: { label: "要約待ち", className: "bg-orange-100 text-orange-700" },
  summarizing: { label: "要約中", className: "bg-purple-100 text-purple-700" },
  completed: { label: "完了", className: "bg-green-100 text-green-700" },
  error: { label: "エラー", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as MeetingStatus] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
