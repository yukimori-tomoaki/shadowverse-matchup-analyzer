# Shadowverse Matchup Analyzer

Shadowverseの対戦結果CSV/TSVをブラウザで解析し、デッキ別相性表を表示するNext.jsアプリです。

## 起動

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。

## ローカルモード

Supabaseの環境変数が未設定の場合、データはlocalStorageに保存されます。CSV/TSVの解析はブラウザ内で完結します。

## Supabase共有モード

1. Supabaseでプロジェクトを作成する
2. SQL Editorで `supabase/schema.sql` を実行する
3. `.env.example` を `.env.local` にコピーし、Supabase URLとPublishable keyを設定する
4. `npm run dev` を再起動する

ログインは使用せず、Supabase上の共有ボードへ対戦データを蓄積します。管理画面と `/share` の閲覧画面は同じ共有ボードをRealtime購読します。

### 相性表の公開

対戦データを読み込むと共有DBへ追加されます。閲覧者は固定URL `/share` を開くだけで、常に最新の相性表を閲覧できます。公開URLの発行操作は不要です。

CSVを追加すると、既存データへ追記されます。同一CSV行のIDが一致する場合は重複登録されません。

既存のSupabaseプロジェクトへ追加する場合は、SQL Editorで `supabase/public_share.sql` を実行してください。新規作成時は `supabase/schema.sql` に公開設定も含まれています。

## 取扱説明書

- プロジェクト概要: `docs/PROJECT_OVERVIEW.md`
- 開発者向け: `docs/DEVELOPER_GUIDE.md`
- 閲覧者向け: `docs/VIEWER_GUIDE.md`

CSVは次のヘッダーに対応しています。`LOSE` も `LOSS` と同じ敗北として扱います。

```text
記録日時(YYYY-MM-DD HH:mm:ss),フォーマット,自分デッキ,相手デッキ,手番,勝敗,メモ
```
