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
3. Authentication > ProvidersでEmailを有効化する
4. `.env.example` を `.env.local` にコピーし、Supabase URLとAnon Keyを設定する
5. `npm run dev` を再起動する

ログインリンク方式で認証し、ユーザーごとに作成されたデフォルトワークスペースへ接続します。同じワークスペースのメンバーが追加した対戦データはSupabase Realtime経由で画面へ反映されます。

### 相性表の公開

ログイン済みの編集者が対戦データを読み込むと、「公開URLを作成」ボタンが表示されます。生成された `/share/<token>` のURLを共有すると、ログイン不要の閲覧専用ページで相性表を公開できます。公開ページではCSV追加や削除はできず、対戦データの更新だけがRealtimeで反映されます。

未ログインでもCSVを読み込んだ状態なら、同じ画面の「ログインなしで相性表を公開」からゲスト公開できます。ゲスト公開はログイン済みワークスペースとは分離され、閲覧専用URLになります。

既存のSupabaseプロジェクトへ追加する場合は、SQL Editorで `supabase/public_share.sql` を実行してください。新規作成時は `supabase/schema.sql` に公開設定も含まれています。

### メンバー追加

`workspace_members` に対象ユーザーのIDを追加すると、既存ワークスペースを共有できます。権限は `owner`、`editor`、`viewer` のいずれかです。ユーザーIDはAuthentication > Usersで確認できます。

```sql
insert into public.workspace_members (workspace_id, user_id, role)
values ('WORKSPACE_UUID', 'USER_UUID', 'viewer');
```

CSVは次のヘッダーに対応しています。`LOSE` も `LOSS` と同じ敗北として扱います。

```text
日付(YYYY-MM-DD),表示日時,自分デッキ,相手デッキ,手番,勝敗,メモ
```
