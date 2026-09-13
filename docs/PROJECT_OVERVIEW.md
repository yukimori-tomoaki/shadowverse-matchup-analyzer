# Shadowverse Matchup Analyzer プロジェクト概要

## 1. 目的

Shadowverseの対戦結果CSV/TSVを読み込み、デッキごとの相性を自動集計・可視化するWebアプリです。

管理者が対戦結果を登録すると、Supabaseの共有データベースへ保存されます。閲覧者はログインせずに公開ページを開くだけで、最新の相性表を確認できます。

## 2. 現在の完成形

```text
管理者
  ↓ CSV / TSVを読み込む
ブラウザで解析
  ↓
Supabase共有DBへ対戦データを追加
  ↓ Realtime
管理画面と閲覧画面を自動更新

閲覧者
  ↓
https://shadowverse-matchup-analyzer.vercel.app/share
  ↓
最新の相性表を閲覧
```

現在は公開URLを発行する必要はありません。全員が同じ固定URL `/share` を使用します。

## 3. 主な機能

### データ登録

- CSV / TSV対応
- UTF-8対応
- ブラウザ上でCSVを解析
- `WIN`を勝利として集計
- `LOSS`と`LOSE`を敗北として集計
- CSVを追加登録可能
- 同じIDのデータはDB側で重複登録を防止

### 相性分析

- 総対戦数
- 勝利数・敗北数
- 総合勝率
- デッキ自動検出
- デッキ別相性表
- 勝敗数表示
- 対戦数表示
- 対角線の`—`
- 未対戦組み合わせの`N/A`
- 対戦数に応じた信頼度表示
- 相性セルの色分け
- 相性セルの詳細表示
- 先攻・後攻別勝率
- 得意・苦手デッキ

### 絞り込み・履歴

- 全期間、今日、過去7日、過去30日、任意期間
- 自分デッキフィルター
- 先攻・後攻フィルター
- 対戦履歴の表示
- 日付・デッキ・勝敗などのソート

### 共有

- ログイン不要
- 固定URLで閲覧
- Supabase Realtimeによる自動更新
- PC・スマートフォン対応
- 閲覧者は読み取り専用

## 4. 画面構成

### 管理・登録画面

URL：

```text
https://shadowverse-matchup-analyzer-61l3v7fl0-yukimori-tomoaki.vercel.app/
```

用途：

- CSV/TSVの登録
- 共有DBへの追加
- 相性表の確認
- フィルター操作
- 対戦履歴の確認
- データ削除

### 閲覧画面

URL：

```text
https://shadowverse-matchup-analyzer.vercel.app/share
```

用途：

- 最新の共有相性表を閲覧
- 相性セルの詳細確認
- Realtime更新の受信

閲覧画面からCSV登録やデータ削除はできません。

## 5. データモデル

アプリ内部では、対戦データを次の型で扱います。

```ts
type MatchRecord = {
  id: string;
  date: string;
  displayDate: string;
  myDeck: string;
  opponentDeck: string;
  turn: string;
  result: "WIN" | "LOSS";
  memo: string;
};
```

CSVの`LOSE`は、読み込み時に`LOSS`へ変換されます。DB内では勝敗値を`WIN` / `LOSS`へ統一しています。

## 6. Supabase構成

現在の共有ボードで利用するテーブルは次のとおりです。

### public_board_matches

全員が閲覧する共有対戦データです。

主な列：

- `id`: レコードID
- `date`: 対戦日
- `display_date`: 表示日時
- `my_deck`: 自分のデッキ
- `opponent_deck`: 相手のデッキ
- `turn`: 先攻・後攻
- `result`: `WIN` / `LOSS`
- `memo`: メモ
- `created_at`: 登録日時

### RPC

アプリはブラウザから直接INSERTせず、Supabase RPCを使用します。

- `append_public_board_matches(jsonb)`
  - CSV解析済みデータを共有DBへ追加
- `get_public_board_matches()`
  - 共有DBから相性表用データを取得

### RLS

`public_board_matches` はRLSを有効化し、匿名閲覧用のSELECTポリシーを設定しています。

追加処理はRPC経由で行い、テーブルへの直接書き込みを公開しない構成です。

### Realtime

`public_board_matches` を `supabase_realtime` Publicationへ追加しています。

管理画面または閲覧画面で変更通知を受信すると、共有DBを再取得して相性表を更新します。

## 7. セキュリティ方針

- CSVファイルそのものはSupabaseへアップロードしない
- CSVはブラウザで解析する
- ブラウザへ公開してよいSupabase Publishable keyのみ使用する
- `service_role` / `sb_secret_...` は使用しない
- 閲覧者はデータを削除・編集できない
- RLSとRPCでDB操作を制御する

公開ページはURLを知っている人が閲覧できます。個人情報や公開したくない内容をメモ欄へ入力しないでください。

## 8. デプロイ構成

```text
GitHub
  └── yukimori-tomoaki/shadowverse-matchup-analyzer
        ↓ mainへPush
Vercel
  └── Next.jsを自動ビルド・本番公開
        ↓
Supabase
  ├── Database
  ├── RPC
  └── Realtime
```

### デプロイ手順

1. GitHubの`main`へPush
2. Vercelが自動デプロイ
3. デプロイが`Ready / Production`になることを確認
4. VercelのEnvironment VariablesにSupabase設定を登録
5. Supabase SQL Editorで`supabase/public_share.sql`を実行

## 9. 主要ファイル

```text
src/
├── app/
│   ├── page.tsx                 管理・登録画面
│   ├── share/page.tsx           固定公開閲覧画面
│   └── share/[token]/page.tsx   旧URL互換画面
├── components/
│   ├── CsvUploader.tsx          CSV/TSVアップロード
│   ├── MatchupTable.tsx        相性表
│   ├── MatchupDetail.tsx       相性詳細
│   ├── SummaryCards.tsx         概要カード
│   ├── FilterPanel.tsx          フィルター
│   ├── DeckStats.tsx            デッキ別統計
│   └── MatchHistoryTable.tsx    対戦履歴
├── lib/
│   ├── csvParser.ts             CSV解析
│   ├── matchupCalculator.ts     集計ロジック
│   ├── publicBoard.ts           共有DBとの通信
│   ├── supabase.ts              Supabaseクライアント
│   └── storage.ts               ローカルモード保存
└── types/
    └── match.ts                 TypeScript型定義

supabase/
├── schema.sql                   新規DB用の全スキーマ
└── public_share.sql             既存DB用の追加・更新SQL
```

## 10. 運用フロー

### 管理者

1. `/` を開く
2. CSV/TSVを読み込む
3. 登録結果と相性表を確認する
4. 閲覧者へ `/share` のURLを共有する
5. 新しいCSVを追加する
6. 閲覧者側へRealtime反映されることを確認する

### 閲覧者

1. `/share` を開く
2. 相性表を確認する
3. 相性セルをクリックして詳細を見る
4. 更新通知または再読み込みで最新データを確認する

## 11. 現在の制限

- CSVの1回の登録は最大5,000戦
- 閲覧画面は共有DBの全データを取得して集計
- 大量データではページング・集計テーブルが必要
- ログイン認証は使用しない
- URLを知っている人は相性表を閲覧できる
- Supabase Freeプランの容量・通信量に依存する

## 12. 今後の拡張候補

- 管理者用の削除権限
- 公開データと非公開メモの分離
- 公開停止スイッチ
- 集計済み相性テーブル
- 期間別の集計テーブル
- PNG / CSVエクスポート
- クラス別・大会別集計
- 管理者ログインまたは管理用トークン
- DB容量・Realtime接続数の監視
