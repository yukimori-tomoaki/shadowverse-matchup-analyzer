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

ログインは使用せず、公開URL単位で対戦データを共有します。同じ公開URLへ追加されたデータはSupabase Realtime経由で閲覧者へ反映されます。

### 相性表の公開

対戦データを読み込むと、「ログインなしで相性表を公開」ボタンが表示されます。生成された `/share/<token>?guest=1` のURLを共有すると、ログイン不要の閲覧専用ページで相性表を公開できます。公開ページではCSV追加や削除はできず、対戦データの更新だけがRealtimeで反映されます。

CSVを追加すると、公開元のブラウザに保存された同じ公開URLのデータが更新されます。

既存のSupabaseプロジェクトへ追加する場合は、SQL Editorで `supabase/public_share.sql` を実行してください。新規作成時は `supabase/schema.sql` に公開設定も含まれています。

## 取扱説明書

- 開発者向け: `docs/DEVELOPER_GUIDE.md`
- 閲覧者向け: `docs/VIEWER_GUIDE.md`

CSVは次のヘッダーに対応しています。`LOSE` も `LOSS` と同じ敗北として扱います。

```text
日付(YYYY-MM-DD),表示日時,自分デッキ,相手デッキ,手番,勝敗,メモ
```
