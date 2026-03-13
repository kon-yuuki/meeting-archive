# 議事録管理システム タスクシート

## Phase 1：MVP実装

### 1. 環境・基盤構築

- [ ] Next.jsプロジェクト作成（App Router）
- [ ] PostgreSQL接続設定（Prisma or Drizzle）
- [ ] Supabase Storage or S3互換ストレージ接続設定
- [ ] 環境変数設定（`.env.local`）
  - `DATABASE_URL`
  - `STORAGE_BUCKET_NAME`
  - `OPENAI_API_KEY` または `ANTHROPIC_API_KEY`
  - `TRANSCRIPTION_WORKER_ENABLED`
  - `INTERNAL_API_BASE_URL`

---

### 2. DB設計・マイグレーション

- [ ] `projects` テーブル作成
  - id, project_code, project_name, client_name, status, notebooklm_url, created_at, updated_at
- [ ] `meetings` テーブル作成
  - id, project_id, zoom_meeting_id, title, meeting_date, host_name, participant_text
  - audio_file_path, transcript_raw_path, transcript_text
  - summary_text, summary_json
  - status, error_message
  - notebooklm_synced, notebooklm_synced_at
  - created_at, updated_at
- [ ] `meeting_actions` テーブル作成
  - id, meeting_id, assignee, action_text, due_date, status, created_at, updated_at
- [ ] `processing_logs` テーブル作成
  - id, meeting_id, process_type, result, message, created_at
- [ ] マイグレーション実行・動作確認

---

### 3. バックエンドAPI実装

#### プロジェクトAPI
- [ ] `GET /api/projects` - 案件一覧取得
- [ ] `POST /api/projects` - 案件作成
- [ ] `GET /api/projects/:id` - 案件詳細取得
- [ ] `PATCH /api/projects/:id` - 案件更新

#### 会議API
- [ ] `GET /api/meetings` - 会議一覧取得（クエリ: project_id, keyword, status, date_from, date_to, notebooklm_synced）
- [ ] `POST /api/meetings` - 会議登録（音声ファイルアップロード含む）
- [ ] `GET /api/meetings/:id` - 会議詳細取得
- [ ] `PATCH /api/meetings/:id` - 会議情報更新

#### 処理API
- [ ] `POST /api/meetings/:id/retranscribe` - 再文字起こし実行
- [ ] `POST /api/meetings/:id/resummarize` - 再要約実行

---

### 4. 音声ファイルアップロード

- [ ] ストレージへのファイルアップロード処理実装
- [ ] パス設計: `projects/{project_id}/meetings/{meeting_id}/audio/`
- [ ] アップロード後にmeetingレコードを `uploaded` ステータスで作成

---

### 5. 文字起こし処理（ワーカー）

- [ ] `scripts/worker/transcribe/` にワーカースクリプト作成
- [ ] faster-whisper または whisper.cpp の導入
- [ ] `queued_for_transcription` の会議を定期ポーリングで取得
- [ ] 文字起こし実行・`transcript_text` 保存
- [ ] 生文字起こしファイルをストレージに保存（パス: `projects/{project_id}/meetings/{meeting_id}/transcript/`）
- [ ] ステータスを `transcribed` に更新
- [ ] 失敗時は `error` ステータス・`error_message` 保存・`processing_logs` 記録
- [ ] 再文字起こし対応（ステータスリセット→再キュー）

---

### 6. 要約処理

- [ ] `scripts/worker/summarize/` にワーカースクリプト作成
- [ ] OpenAI API または Claude API を使った要約実装
- [ ] `transcript_text`・会議タイトル・参加者・案件名を入力
- [ ] 出力フォーマット（必須項目）:
  - overview（会議概要）
  - decisions（決定事項）
  - unresolved（未決事項）
  - issues（課題）
  - client_requests（クライアント要望）
  - next_actions（次回までの対応）
  - action_items（担当者別アクション）
- [ ] `summary_text`・`summary_json` を保存
- [ ] `meeting_actions` レコードを生成
- [ ] ステータスを `completed` に更新
- [ ] 失敗時は `error` ステータス・エラー記録
- [ ] 再要約対応

---

### 7. フロントエンド実装

#### 会議一覧画面 (`/meetings`)
- [ ] 一覧テーブル表示
  - 会議日・プロジェクト名・クライアント名・会議タイトル・録音有無・文字起こし有無・要約有無・NotebookLM反映有無・ステータス
- [ ] 検索フォーム（キーワード・プロジェクト・クライアント・期間・ステータス）
- [ ] 処理状態のバッジ表示

#### 会議詳細画面 (`/meetings/:id`)
- [ ] 会議メタ情報表示
- [ ] 音声再生プレイヤー
- [ ] 生文字起こし表示
- [ ] 要約表示（概要・決定事項・未決事項・課題・アクション項目）
- [ ] NotebookLMリンク表示
- [ ] 操作ボタン: 再文字起こし・再要約・プロジェクト変更・NotebookLM反映状態更新

#### 会議登録画面 (`/meetings/new`)
- [ ] 入力フォーム（プロジェクト・会議タイトル・会議日・参加者・音声ファイル）
- [ ] 音声ファイルアップロード処理
- [ ] 登録後に一覧または詳細へリダイレクト

#### 案件一覧画面 (`/projects`)
- [ ] 案件一覧表示（案件コード・案件名・クライアント名・NotebookLM URL）
- [ ] 案件作成ボタン

#### 案件詳細画面 (`/projects/:id`)
- [ ] 案件情報表示・編集
- [ ] 紐づく会議一覧表示
- [ ] NotebookLM URL管理

---

### 8. 検索機能

- [ ] キーワード全文検索実装（PostgreSQL ILIKE または Full Text Search）
- [ ] 検索対象: meetings.title, projects.project_name, projects.client_name, meetings.transcript_text, meetings.summary_text

---

## Phase 2：品質向上

- [ ] NotebookLM管理項目の充実（最終反映日時・反映済み会議リスト）
- [ ] 再処理導線の改善（エラー会議の一括確認・再処理UI）
- [ ] 権限制御整備
  - 認証導入（Supabase Auth または NextAuth）
  - admin / member ロール設計
  - プロジェクト単位の閲覧制御

---

## Phase 3：拡張機能

- [ ] Zoom録音の自動取り込み
- [ ] NotebookLM連携の自動化
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
