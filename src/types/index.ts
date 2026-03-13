export type MeetingStatus =
  | "uploaded"
  | "queued_for_transcription"
  | "transcribing"
  | "transcribed"
  | "queued_for_summary"
  | "summarizing"
  | "completed"
  | "error";

export interface SummaryJson {
  overview: string;
  decisions: string[];
  unresolved: string[];
  issues: string[];
  client_requests: string[];
  next_actions: string[];
  action_items: { assignee: string; action: string; due_date?: string }[];
}
