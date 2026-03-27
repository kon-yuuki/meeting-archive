# 議事録管理システム タスクシート

## 進捗サマリー（2026-03-19 更新）

| Phase | 状況 |
|-------|------|
| Phase 1: MVP実装 | ほぼ完了。ワーカー・検索はコード実装済み、本番動作確認待ち |
| Phase 2: 品質向上 | 認証・一括再処理・NotebookLM管理 実装済み |
| Phase 3: 拡張機能 | Zoom自動取り込み 実装済み |
| インフラ設定 | **Windows社内PCの初期セットアップは進行中。`.env.local`、DB初期化、起動確認が残タスク** |

---

## 残タスク（優先順）

### 高優先

- [ ] **社内PCの環境設定**（Windows PCで Git / Node.js / npm / Python 3.12 / `.venv` / `faster-whisper` までは完了。`.env.local` の設定、DBマイグレーション実行、起動確認が残り）
- [ ] 文字起こしワーカーの本番動作確認（`scripts/worker/transcribe/`）
  - faster-whisper / whisper.cpp の導入・パス設定が必要
- [ ] 文字起こしモデルの精度改善
  - `kotoba-whisper-v2.0` / `whisper-large-v3-turbo` / `gpt-4o-transcribe` を候補比較
  - サンプル音声で精度・速度・コストを評価して採用モデルを決定
  - 採用モデルへワーカー実装を切り替え
- [ ] 要約ワーカーの本番動作確認（`scripts/worker/summarize/`）
  - `OPENAI_API_KEY` または `ANTHROPIC_API_KEY` の設定が必要
- [ ] Supabase Storage 接続確認（`STORAGE_BUCKET_NAME` 等の設定）

### 中優先

- [ ] 検索機能の動作確認（キーワード全文検索: ILIKE or Full Text Search）
- [ ] Zoom Webhook の本番設定（`scripts/lib/zoom.ts`, `/api/webhooks/zoom`）
  - Zoom App の認証情報設定が必要
- [ ] NotebookLM連携の自動化（現状はURL管理のみ）

### 低優先

- [ ] 意味検索・類似会議検索
- [ ] アクション項目の外部タスク管理ツール連携
- [ ] Slack通知

---

## Phase 1：MVP実装

### 1. 環境・基盤構築

- [x] Next.jsプロジェクト作成（App Router）
- [x] PostgreSQL接続設定（Prisma）
- [x] Supabase Storage 接続設定（`src/lib/storage.ts`）
- [x] 環境変数設定（`.env.local`）← **社内PCでの設定が必要**
  - `DATABASE_URL`
  - `STORAGE_BUCKET_NAME`
  - `OPENAI_API_KEY` または `ANTHROPIC_API_KEY`
  - `TRANSCRIPTION_WORKER_ENABLED`
  - `INTERNAL_API_BASE_URL`

---

### 2. DB設計・マイグレーション

- [x] `projects` テーブル作成
- [x] `meetings` テーブル作成
- [x] `meeting_actions` テーブル作成
- [x] `processing_logs` テーブル作成
- [x] マイグレーションファイル作成済み ← **社内PCでの `prisma migrate deploy` が必要**

---

### 3. バックエンドAPI実装

#### プロジェクトAPI
- [x] `GET /api/projects`
- [x] `POST /api/projects`
- [x] `GET /api/projects/:id`
- [x] `PATCH /api/projects/:id`

#### 会議API
- [x] `GET /api/meetings`（クエリ: project_id, keyword, status, date_from, date_to, notebooklm_synced）
- [x] `POST /api/meetings`（音声ファイルアップロード含む）
- [x] `GET /api/meetings/:id`
- [x] `PATCH /api/meetings/:id`

#### 処理API
- [x] `POST /api/meetings/:id/retranscribe`
- [x] `POST /api/meetings/:id/resummarize`
- [x] `POST /api/meetings/bulk`（一括再処理）

---

### 4. 音声ファイルアップロード

- [x] ストレージへのファイルアップロード処理（`src/lib/storage.ts`）
- [x] パス設計: `projects/{project_id}/meetings/{meeting_id}/audio/`
- [x] アップロード後に `uploaded` ステータスでレコード作成

---

### 5. 文字起こし処理（ワーカー）

- [x] `scripts/worker/transcribe/index.ts` 作成済み
- [ ] faster-whisper または whisper.cpp の導入（**社内PC設定時に必要**）
- [x] `queued_for_transcription` の定期ポーリング
- [x] 文字起こし実行・`transcript_text` 保存
- [x] 生文字起こしファイルのストレージ保存
- [x] ステータス `transcribed` に更新
- [x] 失敗時のエラーハンドリング・`processing_logs` 記録
- [x] 再文字起こし対応

---

### 6. 要約処理

- [x] `scripts/worker/summarize/index.ts` 作成済み
- [x] OpenAI API / Claude API による要約実装
- [x] 出力フォーマット（overview / decisions / unresolved / issues / client_requests / next_actions / action_items）
- [x] `summary_text` / `summary_json` 保存
- [x] `meeting_actions` レコード生成
- [x] ステータス `completed` に更新
- [x] 失敗時のエラーハンドリング
- [x] 再要約対応

---

### 7. フロントエンド実装

#### 会議一覧画面 (`/meetings`)
- [x] 一覧テーブル表示
- [x] 検索フォーム
- [x] 処理状態のバッジ表示（`src/components/StatusBadge.tsx`）

#### 会議詳細画面 (`/meetings/:id`)
- [x] 会議メタ情報表示
- [x] 生文字起こし表示
- [x] 要約表示
- [x] NotebookLMリンク表示
- [x] 操作ボタン（再文字起こし・再要約・NotebookLM反映状態更新）
- [ ] 音声再生プレイヤー（未実装）

#### 会議登録画面 (`/meetings/new`)
- [x] 入力フォーム
- [x] 音声ファイルアップロード
- [x] 登録後リダイレクト

#### 案件一覧画面 (`/projects`)
- [x] 案件一覧表示
- [x] 案件作成ボタン

#### 案件詳細画面 (`/projects/:id`)
- [x] 案件情報表示・編集
- [x] 紐づく会議一覧表示
- [x] NotebookLM URL管理

---

### 8. 検索機能

- [x] キーワード全文検索実装（PostgreSQL ILIKE）
- [x] 検索対象: meetings.title, projects.project_name, projects.client_name, meetings.transcript_text, meetings.summary_text

---

## Phase 2：品質向上

- [x] NotebookLM管理項目（最終反映日時・反映API: `/api/projects/:id/notebooklm`）
- [x] 再処理導線（エラー会議の一括再処理: `/api/meetings/bulk`）
- [x] 認証導入（NextAuth + credentials）
- [x] admin / member ロール設計
- [ ] プロジェクト単位の閲覧制御（未実装）

---

## Phase 3：拡張機能

- [x] Zoom録音の自動取り込み（`/api/webhooks/zoom`, `src/lib/zoom.ts`）
- [ ] NotebookLM連携の自動化（現状はURL管理・手動更新のみ）
- [ ] 意味検索・類似会議検索
- [ ] アクション項目の外部タスク管理ツール連携
- [ ] Slack通知

---

## 補足

### ステータス遷移

```
uploaded
  → queued_for_transcription
    → transcribing
      → transcribed
        → queued_for_summary
          → summarizing
            → completed
（各ステップで失敗時は → error）
```

### 会議タイトル命名規則

```
【案件コード】クライアント名_会議種別_YYYY-MM-DD
例: 【PJ-001】〇〇株式会社_定例MTG_2026-03-13
```
