# 議事録管理システム Windows社内PCセットアップ手順

## 1. 目的

本書は、Windows の社内PCに開発環境が何も入っていない状態から、
議事録管理システムを実際に利用できる状態までセットアップするための手順書である。

対象は以下の用途を含む。

- Webアプリの起動
- 音声ファイルのアップロード
- 文字起こしワーカーの起動
- 要約ワーカーの起動

## 2. 前提

- 社内PCは Windows
- このPC上でアプリを起動する
- このPC上で文字起こしワーカーを動かす
- このPC上で要約ワーカーを動かす
- DB は Supabase PostgreSQL を利用する想定
- ストレージは Supabase Storage の S3互換API を利用する想定

## 3. 最初に必要なもの

セットアップ前に、以下の情報を手元に用意する。

- Git リポジトリURL
- `DATABASE_URL`
- `STORAGE_ENDPOINT`
- `STORAGE_BUCKET_NAME`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_REGION`
- `OPENAI_API_KEY` または `ANTHROPIC_API_KEY`
- 必要に応じて Zoom 連携情報
  - `ZOOM_WEBHOOK_SECRET_TOKEN`
  - `ZOOM_ACCOUNT_ID`
  - `ZOOM_CLIENT_ID`
  - `ZOOM_CLIENT_SECRET`

## 4. インストールするもの

以下をこの順でインストールする。

1. Git for Windows
2. Node.js LTS
3. Python 3.11 または 3.12
4. Visual Studio Build Tools

## 5. Git for Windows のインストール

### 手順

1. ブラウザで `Git for Windows` を検索
2. 公式サイトからインストーラをダウンロード
3. 基本はデフォルト設定のままインストール
4. インストール後、PowerShell を開いて以下を実行

```powershell
git --version
```

### 確認ポイント

- バージョンが表示されれば成功

## 6. Node.js のインストール

### 手順

1. ブラウザで `Node.js` を検索
2. 公式サイトから `LTS` 版をダウンロード
3. インストーラを実行
4. 基本はデフォルト設定で進める
5. インストール後、PowerShell を開いて以下を実行

```powershell
node -v
npm -v
```

### 確認ポイント

- `node` と `npm` のバージョンが表示されれば成功

## 7. Python のインストール

### 手順

1. ブラウザで `Python` を検索
2. 公式サイトから Python 3.11 または 3.12 をダウンロード
3. インストーラ起動時に `Add Python to PATH` を必ずオンにする
4. インストールを実行
5. インストール後、PowerShell を開いて以下を実行

```powershell
python --version
pip --version
```

### 確認ポイント

- `python` と `pip` のバージョンが表示されれば成功

## 8. Visual Studio Build Tools のインストール

### 手順

1. ブラウザで `Build Tools for Visual Studio` を検索
2. Microsoft 公式サイトからインストーラをダウンロード
3. インストーラで `C++ build tools` を選択
4. インストールを実行

### 補足

- `faster-whisper` 導入時のビルド関連エラーを避けるために入れておく

## 9. ソースコードの取得

PowerShell を開いて、作業用フォルダに移動してから実行する。

```powershell
cd C:\
mkdir work
cd work
git clone <リポジトリURL>
cd meeting-archive
```

既に取得済みの場合は以下を実行する。

```powershell
cd C:\work\meeting-archive
git pull
```

## 10. 環境変数ファイルの作成

### `.env.local` の作成

プロジェクト直下で以下を実行する。

```powershell
copy .env.example .env.local
notepad .env.local
```

### 最低限必要な設定

`.env.local` に以下を記載する。

```env
DATABASE_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

STORAGE_ENDPOINT="https://XXXX.supabase.co/storage/v1/s3"
STORAGE_BUCKET_NAME="meeting-archive"
STORAGE_ACCESS_KEY="your-access-key-id"
STORAGE_SECRET_KEY="your-secret-access-key"
STORAGE_REGION="ap-northeast-1"

OPENAI_API_KEY="your-openai-api-key"
# または
# ANTHROPIC_API_KEY="your-anthropic-api-key"

TRANSCRIPTION_WORKER_ENABLED="true"
```

### Zoom 自動取り込みも使う場合

```env
ZOOM_WEBHOOK_SECRET_TOKEN="your-webhook-secret-token"
ZOOM_ACCOUNT_ID="your-account-id"
ZOOM_CLIENT_ID="your-client-id"
ZOOM_CLIENT_SECRET="your-client-secret"
```

### 不要な設定

現状のアプリでは以下は不要。

- `AUTH_SECRET`
- `NEXTAUTH_URL`

## 11. DB 初期化

### 推奨方法

Supabase の SQL Editor で実行する。

### 手順

1. Supabase ダッシュボードを開く
2. 対象プロジェクトを開く
3. `SQL Editor` を開く
4. [0001_init](/Users/kon/private-develop/wip/meeting-archive/prisma/migrations/0001_init/migration.sql) の内容を貼り付けて実行
5. 必要に応じて [0002_add_auth](/Users/kon/private-develop/wip/meeting-archive/prisma/migrations/0002_add_auth/migration.sql) も実行

### 補足

- `0001_init` は必須
- `0002_add_auth` は現在のアプリ動作には必須ではないが、実行しても問題ない

## 12. Node パッケージのインストール

PowerShell でプロジェクト直下にいる状態で実行する。

```powershell
npm install
```

## 13. Python 仮想環境の作成

PowerShell で実行する。

```powershell
python -m venv .venv
```

## 14. Python 仮想環境の有効化

PowerShell で実行する。

```powershell
.\.venv\Scripts\Activate.ps1
```

エラーになる場合は、同じ PowerShell で先に以下を実行する。

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

その後、再度以下を実行する。

```powershell
.\.venv\Scripts\Activate.ps1
```

### 確認ポイント

- 行頭に `(.venv)` が表示されれば成功

## 15. `faster-whisper` のインストール

仮想環境を有効化した状態で実行する。

```powershell
pip install faster-whisper
```

インストール後、以下で確認する。

```powershell
python -m faster_whisper --help
```

### 確認ポイント

- ヘルプが表示されれば成功

## 16. Windows での PowerShell の使い分け

Windows では、用途ごとに PowerShell を分けて使うと分かりやすい。

### Webアプリ用の PowerShell

- `npm run dev` を実行するための PowerShell
- 通常は `(.venv)` なしでよい
- Web画面の確認だけならこの PowerShell を使う

```powershell
cd C:\work\meeting-archive
npm run dev
```

### 文字起こし用の PowerShell

- `faster-whisper` を使うための PowerShell
- 必ず `(.venv)` を有効化してから使う
- `(.venv)` は Python 仮想環境が有効な状態を表す

```powershell
cd C:\work\meeting-archive
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

有効化に成功すると、行頭が以下のようになる。

```powershell
(.venv) PS C:\work\meeting-archive>
```

この状態で以下を実行する。

```powershell
npx tsx scripts/worker/transcribe/index.ts
```

### 要約用の PowerShell

- 要約ワーカーを動かすための PowerShell
- 通常は `(.venv)` なしでよい
- OpenAI または Anthropic の API キーが `.env.local` に入っていれば動く

```powershell
cd C:\work\meeting-archive
npx tsx scripts/worker/summarize/index.ts
```

### 補足

- `(.venv)` が必要なのは主に Python を使う処理
- このプロジェクトでは、特に文字起こしワーカーで `(.venv)` が重要
- Webアプリ起動 (`npm run dev`) と要約ワーカーは、基本的に通常の PowerShell でよい

## 17. Webアプリの起動

1つ目の PowerShell で以下を実行する。

```powershell
cd C:\work\meeting-archive
npm run dev
```

ブラウザで以下を開く。

```text
http://localhost:3000
```

## 18. 文字起こしワーカーの起動

2つ目の PowerShell を開いて以下を実行する。

```powershell
cd C:\work\meeting-archive
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
npx tsx scripts/worker/transcribe/index.ts
```

### 役割

- ストレージから音声を取得する
- `faster-whisper` で文字起こしする
- 結果を DB とストレージに保存する

## 19. 要約ワーカーの起動

3つ目の PowerShell を開いて以下を実行する。

```powershell
cd C:\work\meeting-archive
npx tsx scripts/worker/summarize/index.ts
```

### 役割

- 文字起こし済みデータを取得する
- OpenAI または Anthropic API で要約する
- 要約結果を DB に保存する

## 20. 初回動作確認

以下の順で確認する。

1. ブラウザで案件を1件作成する
2. 音声ファイル付きで会議を1件登録する
3. 文字起こしワーカー側にログが出るか確認する
4. 会議詳細画面に文字起こしが表示されるか確認する
5. 要約ワーカー側にログが出るか確認する
6. 会議詳細画面に要約が表示されるか確認する

## 21. 日常運用時に起動するもの

通常利用時は、最低限以下の3つを起動する。

### 1つ目の PowerShell

```powershell
cd C:\work\meeting-archive
npm run dev
```

### 2つ目の PowerShell

```powershell
cd C:\work\meeting-archive
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
npx tsx scripts/worker/transcribe/index.ts
```

### 3つ目の PowerShell

```powershell
cd C:\work\meeting-archive
npx tsx scripts/worker/summarize/index.ts
```

## 22. トラブル時の確認ポイント

### Python が見つからない

```powershell
python --version
```

- バージョンが出ない場合、Python の PATH 設定を確認する

### 仮想環境が有効化できない

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### `faster-whisper` が動かない

```powershell
python -m faster_whisper --help
```

- 失敗する場合、仮想環境が有効か確認する
- Python と Build Tools の導入を確認する

### 音声アップロードに失敗する

- `.env.local` の `STORAGE_*` 設定を確認する
- Supabase Storage バケット `meeting-archive` が存在するか確認する

### 要約に失敗する

- `.env.local` の `OPENAI_API_KEY` または `ANTHROPIC_API_KEY` を確認する

### DB 接続に失敗する

- `.env.local` の `DATABASE_URL` を確認する
- Supabase 側で DB 接続情報が正しいか確認する

## 23. セットアップ完了チェックリスト

- [x] `git --version` が表示される
- [x] `node -v` が表示される
- [x] `npm -v` が表示される
- [x] `python --version` が表示される
- [ ] `.env.local` を作成した
- [ ] DB 初期化を実施した
- [x] `npm install` が完了した
- [x] `.venv` を作成した
- [x] `pip install faster-whisper` が完了した
- [ ] `npm run dev` で画面が開く
- [ ] 文字起こしワーカーが起動する
- [ ] 要約ワーカーが起動する
- [ ] 会議登録から要約表示まで確認できた
