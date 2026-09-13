# Shadowverse Matchup Analyzer 開発者向け取扱説明書

## 1. アプリの概要

Shadowverseの対戦結果CSV/TSVを読み込み、デッキ別の勝率・勝敗数・対戦数・先攻後攻の傾向を表示するWebアプリです。

現在の共有方式はログイン不要の共有ボード方式です。

```text
CSV読み込み
  -> ブラウザで解析
  -> Supabaseの共有ボードへ追記
  -> /share で閲覧
  -> 管理画面と閲覧者へRealtime反映
```

CSVファイル自体をアップロードするのではなく、解析済みの対戦レコードをSupabaseへ保存します。

## 2. 技術構成

- Next.js / React / TypeScript
- Tailwind CSS
- Papa Parse
- Supabase Database / RPC / Realtime
- Vercel

主要なコード：

- `src/app/page.tsx`: 管理・更新画面
- `src/app/share/[token]/page.tsx`: 公開閲覧画面
- `src/lib/csvParser.ts`: CSV/TSV解析
- `src/lib/matchupCalculator.ts`: 勝率・相性集計
- `src/lib/guestPublish.ts`: 公開データの作成・更新
- `src/lib/publicShare.ts`: 公開データの取得
- `src/lib/publicBoard.ts`: 共有ボードの追加・取得
- `supabase/public_share.sql`: 既存Supabase向け設定

## 3. ローカル開発

```powershell
cd C:\Users\<ユーザー名>\shadowverse-matchup-analyzer
npm install
npm run dev
```

ブラウザで次を開きます。

```text
http://localhost:3000
```

静的検証：

```powershell
npm run lint
npm run build
```

## 4. Supabase設定

### 新規プロジェクト

Supabase SQL Editorで `supabase/schema.sql` を実行します。

### 既存プロジェクト

Supabase SQL Editorで `supabase/public_share.sql` を実行します。

このSQLで次が作成されます。

- `guest_publications` テーブル
- ゲスト公開データ作成RPC
- ゲスト公開データ更新RPC
- ゲスト公開データ取得RPC
- `guest_publications` のRealtime設定
- `public_board_matches` 共有テーブル
- 共有ボードへの追加・取得RPC
- 匿名閲覧用RLS

SQL実行後に、SupabaseのTable Editorで `guest_publications` が存在することを確認します。

## 5. 環境変数

`.env.local` に設定します。`.env.local` はGitへコミットしません。

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

URL末尾に `/rest/v1/` は付けません。

Vercelでは **Settings → Environment Variables** に同じ2つを登録します。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

適用環境はProductionを必須とし、必要に応じてPreviewとDevelopmentも選択します。

`service_role` や `sb_secret_...` はブラウザへ公開してはいけません。

## 6. Vercel公開

1. GitHubの `yukimori-tomoaki/shadowverse-matchup-analyzer` をVercelへImport
2. Framework PresetはNext.js
3. Root Directoryは`./`
4. 環境変数を登録
5. Deploy

コードを更新した場合は、`main`へPushすると自動デプロイされます。VercelのDeploymentsで最新デプロイが `Ready / Production` になることを確認します。

## 7. 公開URLの運用

1. Vercel公開サイトを開く
2. CSV/TSVを読み込む
3. 共有DBへ自動登録されることを確認する
4. 固定URL `/share` を閲覧者へ共有する

公開URLの形式：

```text
https://<vercel-domain>/share
```

CSV追加はブラウザのlocalStorageではなく、Supabaseの`public_board_matches`へ保存されます。別のブラウザからでも同じ共有ボードを閲覧できます。

## 8. データ仕様

必須ヘッダー：

```text
記録日時(YYYY-MM-DD HH:mm:ss),フォーマット,自分デッキ,相手デッキ,手番,勝敗,メモ
```

- 区切り文字はカンマまたはタブ
- 文字コードはUTF-8
- `WIN` は勝利
- `LOSS` と `LOSE` は敗北として保存時に `LOSS` へ統一
- 空の自分デッキ・相手デッキはスキップ
- 1回のゲスト公開は最大5,000戦

## 9. 障害対応

### 公開URLが開けない

- `localhost` URLを共有していないか確認
- Vercelのドメインを使う
- URL末尾に `?guest=1` があるか確認
- Supabase SQLを実行済みか確認

### Invalid API key

- Vercelの環境変数を確認
- URLとPublishable keyが同じSupabaseプロジェクトか確認
- URLに`/rest/v1/`を付けない
- 環境変数変更後にRedeploy

### 公開データを更新できない

- `public_share.sql` を最新内容で再実行
- `update_guest_publication` RPCの存在を確認
- Supabase Realtimeに`guest_publications`が追加されているか確認
- 公開URLを発行した元のブラウザでCSVを追加しているか確認

### 反映が遅い

- 閲覧者側を再読み込み
- Vercelの最新デプロイがReadyか確認
- SupabaseのRealtime設定を確認

## 10. セキュリティと運用上の注意

公開URLを知っている人は、URLに紐づく対戦データを閲覧できます。個人情報や非公開メモをCSVへ含めないでください。

ゲスト公開はログイン認証がないため、URLを失くすと管理画面から簡単に停止できません。将来的には以下を追加します。

- 公開URLの無効化
- 有効期限
- 公開URLの再生成
- 公開用データと内部メモの分離
- 匿名投稿へのレート制限
- CAPTCHA
