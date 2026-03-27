/**
 * 要約ワーカー
 *
 * 動作要件:
 *   - ANTHROPIC_API_KEY または OPENAI_API_KEY が設定済み
 *   - DATABASE_URL が設定済み
 *
 * 実行方法:
 *   npx tsx scripts/worker/summarize/index.ts
 */

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SummaryJson } from "@/types";

dotenv.config({ path: ".env.local" });

const POLL_INTERVAL_MS = 15_000;
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "gemma3:4b";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---- AI API call ----

async function callOllamaApi(prompt: string): Promise<string> {
  const res = await fetch(
    `${process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL}/api/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json",
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama API error: ${res.status} - ${body}`);
  }

  const data = await res.json();
  return data.response as string;
}

async function callAnthropicApi(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-1-20250805",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error: ${res.status} - ${body}`);
  }
  const data = await res.json();
  return data.content[0].text as string;
}

async function callOpenAiApi(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

async function generateSummary(
  transcriptText: string,
  title: string,
  projectName?: string,
  participants?: string
): Promise<SummaryJson> {
  const prompt = `以下は会議の文字起こしです。指定のJSONフォーマットで要約を生成してください。

## 会議情報
- タイトル: ${title}
${projectName ? `- 案件名: ${projectName}` : ""}
${participants ? `- 参加者: ${participants}` : ""}

## 文字起こし
${transcriptText}

## 出力フォーマット（JSON）
{
  "overview": "会議全体の概要（2〜3文）",
  "decisions": ["決定事項1", "決定事項2"],
  "unresolved": ["未決事項1", "未決事項2"],
  "issues": ["課題1", "課題2"],
  "client_requests": ["クライアント要望1", "クライアント要望2"],
  "next_actions": ["次回までに対応すること1", "次回までに対応すること2"],
  "action_items": [
    { "assignee": "担当者名", "action": "タスク内容", "due_date": "YYYY-MM-DD または null" }
  ]
}

JSONのみ返してください。`;

  let raw: string;
  if (process.env.OLLAMA_ENABLED === "true") {
    raw = await callOllamaApi(prompt);
  } else if (process.env.ANTHROPIC_API_KEY) {
    raw = await callAnthropicApi(prompt);
  } else if (process.env.OPENAI_API_KEY) {
    raw = await callOpenAiApi(prompt);
  } else {
    throw new Error(
      "No summarization provider configured (set OLLAMA_ENABLED=true, ANTHROPIC_API_KEY, or OPENAI_API_KEY)"
    );
  }

  // Extract JSON from response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from AI response");
  return JSON.parse(jsonMatch[0]) as SummaryJson;
}

function summaryToText(s: SummaryJson): string {
  const lines: string[] = [];
  lines.push(`【会議概要】\n${s.overview}\n`);
  if (s.decisions.length) lines.push(`【決定事項】\n${s.decisions.map((d) => `・${d}`).join("\n")}\n`);
  if (s.unresolved.length) lines.push(`【未決事項】\n${s.unresolved.map((u) => `・${u}`).join("\n")}\n`);
  if (s.issues.length) lines.push(`【課題】\n${s.issues.map((i) => `・${i}`).join("\n")}\n`);
  if (s.client_requests.length) lines.push(`【クライアント要望】\n${s.client_requests.map((c) => `・${c}`).join("\n")}\n`);
  if (s.next_actions.length) lines.push(`【次回までの対応】\n${s.next_actions.map((n) => `・${n}`).join("\n")}\n`);
  if (s.action_items.length) {
    lines.push(`【担当者別アクション】`);
    s.action_items.forEach((a) => {
      const due = a.due_date ? ` (期限: ${a.due_date})` : "";
      lines.push(`・[${a.assignee}] ${a.action}${due}`);
    });
  }
  return lines.join("\n");
}

async function processOne() {
  const meeting = await prisma.meeting.findFirst({
    where: { status: "queued_for_summary" },
    orderBy: { createdAt: "asc" },
    include: { project: true },
  });

  if (!meeting) return;

  console.log(`[summarize] Processing meeting: ${meeting.id} - ${meeting.title}`);

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "summarizing" },
  });

  try {
    if (!meeting.transcriptText) throw new Error("No transcript text");

    const summaryJson = await generateSummary(
      meeting.transcriptText,
      meeting.title,
      meeting.project?.projectName,
      meeting.participantText ?? undefined
    );
    const summaryText = summaryToText(summaryJson);

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "completed",
        summaryJson: summaryJson as object,
        summaryText,
        errorMessage: null,
      },
    });

    // Save action items
    if (summaryJson.action_items.length > 0) {
      await prisma.meetingAction.deleteMany({ where: { meetingId: meeting.id } });
      await prisma.meetingAction.createMany({
        data: summaryJson.action_items.map((a) => ({
          meetingId: meeting.id,
          assignee: a.assignee,
          actionText: a.action,
          dueDate: a.due_date ? new Date(a.due_date) : null,
          status: "open",
        })),
      });
    }

    await prisma.processingLog.create({
      data: {
        meetingId: meeting.id,
        processType: "summarization",
        result: "success",
        message: `Summary generated with ${summaryJson.action_items.length} action items`,
      },
    });

    console.log(`[summarize] Done: ${meeting.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[summarize] Error: ${meeting.id} - ${message}`);

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: "error", errorMessage: message },
    });

    await prisma.processingLog.create({
      data: {
        meetingId: meeting.id,
        processType: "summarization",
        result: "error",
        message,
      },
    });
  }
}

async function main() {
  console.log("[summarize] Worker started. Polling every", POLL_INTERVAL_MS / 1000, "s");
  if (process.env.OLLAMA_ENABLED === "true") {
    console.log("[summarize] Provider: Ollama");
    console.log(
      "[summarize] Base URL:",
      process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL
    );
    console.log("[summarize] Model:", process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL);
  } else if (process.env.ANTHROPIC_API_KEY) {
    console.log("[summarize] Provider: Anthropic");
    console.log(
      "[summarize] Model:",
      process.env.ANTHROPIC_MODEL ?? "claude-opus-4-1-20250805"
    );
  } else if (process.env.OPENAI_API_KEY) {
    console.log("[summarize] Provider: OpenAI");
    console.log("[summarize] Model: gpt-4o-mini");
  }

  while (true) {
    await processOne().catch(console.error);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main();
