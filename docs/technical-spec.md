# 議事録管理システム 技術仕様書

## 1. 概要

本システムは、クライアントMTGの録音データをもとに、文字起こし・要約・案件単位での蓄積・一覧管理・検索を行う社内向けWebシステムである。

技術方針は以下とする。

- 文字起こしは社内PC1台でローカル実行する
- 要約は外部AI APIを利用する
- 正本データはDBおよびストレージに保存する
- NotebookLMは案件単位の探索用途として利用する
- フロントは社内メンバーがブラウザで利用する

## 2. システム構成

### 2.1 構成要素

- フロントエンド
- バックエンド
- データベース
- ファイルストレージ
- 文字起こし実行PC
- 外部要約API
- NotebookLM

### 2.2 想定構成

#### フロントエンド

- Next.js

#### バックエンド

- Next.js API Routes または Node.js API

#### データベース

- PostgreSQL

#### ストレージ

- Supabase Storage または S3互換ストレージ

#### 文字起こし処理

- 社内PC1台
- Whisper系実装をローカル実行

#### 要約処理

- OpenAI API または Claude API

## 3. アーキテクチャ方針

### 3.1 方針

- UI、業務API、文字起こし処理を役割分離する
- 音声ファイル処理は非同期ジョブとして扱う
- 要約処理も非同期ジョブとして扱う
- 会議データの状態はステータス管理する

### 3.2 処理単位

会議1件を1処理単位とする。

## 4. 処理フロー

### 4.1 基本フロー

1. 会議音声ファイルを登録する
2. `meeting` レコードを作成する
3. ステータスを `uploaded` にする
4. 文字起こしジョブを投入する
5. 社内PCが文字起こしを実行する
6. 文字起こし結果を保存する
7. ステータスを `transcribed` にする
8. 要約ジョブを投入する
9. 要約APIを実行する
10. 要約結果を保存する
11. ステータスを `completed` にする

### 4.2 手動再処理フロー

- 再文字起こし
- 再要約
- プロジェクト再紐づけ

## 5. ステータス設計

`meeting.status` は以下を持つ。

- `uploaded`
- `queued_for_transcription`
- `transcribing`
- `transcribed`
- `queued_for_summary`
- `summarizing`
- `completed`
- `error`

## 6. データモデル

### 6.1 projects

案件マスタ。

#### カラム

- id
- project_code
- project_name
- client_name
- status
- notebooklm_url
- created_at
- updated_at

### 6.2 meetings

会議本体。

#### カラム

- id
- project_id
- zoom_meeting_id
- title
- meeting_date
- host_name
- participant_text
- audio_file_path
- transcript_raw_path
- transcript_text
- summary_text
- summary_json
- status
- error_message
- notebooklm_synced
- notebooklm_synced_at
- created_at
- updated_at

### 6.3 meeting_actions

要約から抽出したアクション項目。

#### カラム

- id
- meeting_id
- assignee
- action_text
- due_date
- status
- created_at
- updated_at

### 6.4 processing_logs

処理ログ。

#### カラム

- id
- meeting_id
- process_type
- result
- message
- created_at

## 7. テーブル設計方針

### 7.1 summary_json

構造化要約はJSONで保持する。  
表示用の `summary_text` と併用する。

#### 想定キー

- overview
- decisions
- unresolved
- issues
- client_requests
- next_actions
- action_items

### 7.2 transcript_text

全文検索対象とする。

### 7.3 notebooklm_synced

MVPでは boolean 管理とする。

## 8. API仕様

### 8.1 プロジェクトAPI

#### `GET /api/projects`

案件一覧取得

#### `POST /api/projects`

案件作成

#### `GET /api/projects/:id`

案件詳細取得

#### `PATCH /api/projects/:id`

案件更新

### 8.2 会議API

#### `GET /api/meetings`

会議一覧取得  
対応クエリ例:

- project_id
- keyword
- status
- date_from
- date_to
- notebooklm_synced

#### `POST /api/meetings`

会議登録  
入力:

- project_id
- title
- meeting_date
- participant_text
- audio_file

#### `GET /api/meetings/:id`

会議詳細取得

#### `PATCH /api/meetings/:id`

会議情報更新  
更新対象例:

- project_id
- title
- meeting_date
- participant_text
- notebooklm_synced

### 8.3 処理API

#### `POST /api/meetings/:id/retranscribe`

再文字起こし実行

#### `POST /api/meetings/:id/resummarize`

再要約実行

## 9. フロント画面仕様概要

### 9.1 画面一覧

- 会議一覧画面
- 会議詳細画面
- 会議登録画面
- 案件一覧画面
- 案件詳細画面

### 9.2 会議一覧画面

#### 表示項目

- 会議日
- プロジェクト名
- クライアント名
- 会議タイトル
- 録音有無
- 文字起こし有無
- 要約有無
- NotebookLM反映有無
- ステータス

#### 検索条件

- キーワード
- プロジェクト
- クライアント
- 期間
- ステータス

### 9.3 会議詳細画面

#### 表示内容

- 会議メタ情報
- 音声再生
- 生文字起こし
- 要約
- 決定事項
- 未決事項
- 課題
- アクション項目
- NotebookLMリンク

#### 操作

- 再文字起こし
- 再要約
- プロジェクト変更
- NotebookLM反映状態更新

### 9.4 会議登録画面

#### 入力項目

- プロジェクト
- 会議タイトル
- 会議日
- 参加者
- 音声ファイル

## 10. 文字起こし仕様

### 10.1 実行環境

- 社内PC1台
- ローカル実行
- Whisper系ライブラリを利用

### 10.2 実装候補

- faster-whisper
- whisper.cpp

### 10.3 実行方式

- 定期ポーリング型
- またはジョブキュー監視型

MVPでは、社内PCが一定間隔で未処理会議を取得し、順次処理する方式を想定する。

### 10.4 出力

- 生文字起こしファイル
- transcript_text
- 必要に応じてタイムスタンプ付きデータ

## 11. 要約仕様

### 11.1 入力

- transcript_text
- 必要に応じて会議タイトル、参加者、案件名

### 11.2 出力

- summary_text
- summary_json

### 11.3 要約フォーマット

以下を必須とする。

- overview
- decisions
- unresolved
- issues
- client_requests
- next_actions
- action_items

### 11.4 失敗時

- status を `error` にする
- error_message を保存する
- 再要約可能とする

## 12. 検索仕様

### 12.1 MVP

キーワード全文検索とする。

### 12.2 検索対象

- meetings.title
- projects.project_name
- projects.client_name
- meetings.transcript_text
- meetings.summary_text

### 12.3 実装候補

- PostgreSQL Full Text Search
- 必要に応じてILIKE検索から開始

## 13. 認証・認可仕様

### 13.1 認証

社内利用前提のため、認証方式は別途選定する。  
MVP候補:

- Supabase Auth
- NextAuth

### 13.2 認可

プロジェクト単位で閲覧制御する。

#### ロール

- admin
- member

## 14. ストレージ設計

### 14.1 保存対象

- 音声ファイル
- 生文字起こしファイル

### 14.2 パス設計例

- `projects/{project_id}/meetings/{meeting_id}/audio/`
- `projects/{project_id}/meetings/{meeting_id}/transcript/`

## 15. エラー処理

### 15.1 基本方針

- 失敗は `meeting` 単位で管理する
- 失敗内容は `processing_logs` に記録する
- 再実行可能にする

### 15.2 想定エラー

- ファイルアップロード失敗
- 音声読み込み失敗
- 文字起こし失敗
- 要約API失敗
- DB更新失敗

## 16. ディレクトリ構成案

```text
src/
  app/
    meetings/
    projects/
    api/
  components/
  features/
    meetings/
    projects/
    transcription/
    summarization/
  lib/
  types/
scripts/
  worker/
    transcribe/
    summarize/
docs/
```

## 17. 環境変数想定

- `DATABASE_URL`
- `STORAGE_BUCKET_NAME`
- `OPENAI_API_KEY` または `ANTHROPIC_API_KEY`
- `TRANSCRIPTION_WORKER_ENABLED`
- `INTERNAL_API_BASE_URL`

## 18. MVP実装優先順位

### Phase 1

- DB設計
- 会議登録
- 一覧画面
- 詳細画面
- 音声アップロード
- 文字起こし処理
- 要約処理
- 検索

### Phase 2

- NotebookLM管理項目追加
- 再処理導線改善
- 権限制御整備

### Phase 3

- Zoom連携自動化
- NotebookLM連携自動化
- 意味検索

## 19. 補足方針

- NotebookLMは本システムの正本ではない
- Zoom要約は使用前提にしない
- 音声処理は非同期前提とする
- 技術選定はMVPでは過度に複雑化しない
