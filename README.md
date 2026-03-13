# 議事録管理システム

クライアントMTGの録音データを文字起こし・要約・案件単位で蓄積・管理する社内向けWebシステム。

## 技術スタック

- **フロントエンド / バックエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **DB**: PostgreSQL (Supabase 推奨)
- **ストレージ**: S3互換 (Supabase Storage 推奨)
- **認証**: NextAuth v5 (Credentials)
- **文字起こし**: faster-whisper / whisper.cpp (社内PCでローカル実行)
- **要約**: Anthropic Claude API または OpenAI API

---

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集して各値を設定してください（後述）。

### 3. DBマイグレーション

```bash
# Supabase の SQL Editor、または psql で実行
psql $DATABASE_URL -f prisma/migrations/0001_init/migration.sql
psql $DATABASE_URL -f prisma/migrations/0002_add_auth/migration.sql
```

### 4. 管理者ユーザーの作成

```bash
EMAIL=admin@example.com PASSWORD=yourpassword NAME="管理者" npx tsx scripts/create-admin.ts
```

### 5. 開発サーバー起動

```bash
npm run dev
```

---

## Supabase セットアップ

### Database

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. **Settings → Database → Connection string → Transaction pooler** をコピー
3. `.env.local` の `DATABASE_URL` に設定

```
DATABASE_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
```

### Storage

1. Supabase ダッシュボード → **Storage** → バケット `meeting-archive` を作成（非公開）
2. **Storage → S3 Connection** から以下を取得:
   - Endpoint URL
   - Access Key ID
   - Secret Access Key
3. `.env.local` に設定:

```
STORAGE_ENDPOINT="https://XXXX.supabase.co/storage/v1/s3"
STORAGE_BUCKET_NAME="meeting-archive"
STORAGE_ACCESS_KEY="your-access-key-id"
STORAGE_SECRET_KEY="your-secret-access-key"
STORAGE_REGION="ap-northeast-1"
```

> **注意**: Supabase Storage の S3互換APIは `forcePathStyle: true` が必要です（`src/lib/storage.ts` で設定済み）。

---

## Vercel へのデプロイ

1. GitHub リポジトリを Vercel に連携
2. **Settings → Environment Variables** に `.env.local` の内容をすべて設定
3. デプロイ

```
AUTH_SECRET            # openssl rand -hex 32 で生成
NEXTAUTH_URL           # https://your-app.vercel.app
DATABASE_URL           # Supabase Transaction pooler URL
STORAGE_*              # Supabase Storage S3 接続情報
ANTHROPIC_API_KEY      # または OPENAI_API_KEY
INTERNAL_API_BASE_URL  # https://your-app.vercel.app
# Zoom連携を使う場合
ZOOM_WEBHOOK_SECRET_TOKEN
ZOOM_ACCOUNT_ID
ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET
```

---

## Zoom 自動録音取り込みのセットアップ

録音完了時に自動で会議登録→文字起こしキュー投入されます。

### 1. Zoom Marketplace で Server-to-Server OAuth App を作成

1. [Zoom Marketplace](https://marketplace.zoom.us) にログイン
2. **Develop → Build App → Server-to-Server OAuth** を選択
3. スコープに `cloud_recording:read:admin` を追加
4. **Account ID / Client ID / Client Secret** をコピーして `.env.local` に設定

### 2. Event Subscription（Webhook）の設定

1. 作成したアプリの **Feature → Event Subscriptions** を開く
2. **Add new event subscription**
   - Subscription URL: `https://your-app.vercel.app/api/webhooks/zoom`
   - Event: **Recording → All Recordings have been completed**
3. **Secret Token** をコピーして `ZOOM_WEBHOOK_SECRET_TOKEN` に設定
4. **Validate** ボタンで接続確認

### 3. 会議タイトルの命名規則に従う

Zoom会議タイトルを以下の形式にすると自動で案件紐づけされます:

```
【PJ-001】〇〇株式会社_定例MTG_2026-03-13
```

---

## 文字起こしワーカーの起動（社内PC）

```bash
# faster-whisper のインストール（Python環境）
pip install faster-whisper

# ワーカー起動
TRANSCRIPTION_WORKER_ENABLED=true DATABASE_URL=... npx tsx scripts/worker/transcribe/index.ts
```

---

## 要約ワーカーの起動

```bash
ANTHROPIC_API_KEY=... DATABASE_URL=... npx tsx scripts/worker/summarize/index.ts
```

---

## ディレクトリ構成

```
src/
  app/
    api/           # REST API routes
    meetings/      # 会議一覧・詳細・登録画面
    projects/      # 案件一覧・詳細画面
    admin/         # ユーザー管理（admin only）
    login/         # ログイン画面
  components/      # 共通コンポーネント
  lib/             # Prisma, Storage, Auth クライアント
  types/           # 型定義
scripts/
  worker/
    transcribe/    # 文字起こしワーカー
    summarize/     # 要約ワーカー
  create-admin.ts  # 管理者ユーザー作成
prisma/
  schema.prisma
  migrations/
docs/              # 要件定義・技術仕様・タスクシート
```
