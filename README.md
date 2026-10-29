# Shadowverse Matchup Analyzer

Shadowverseの対戦結果CSV/TSVをブラウザで解析し、デッキ別相性表や勝率、環境別分析を可視化するWebアプリケーションです。

## 主な機能

- **相性分析**:
  - 相性マトリクス（双方向勝率統合・色分け・信頼度表示・PNG保存機能）
  - スマホ最適化カードリスト表示（勝率プログレスバー・信頼度・有利/五分/不利バッジ・対戦詳細ドロワー）
  - デッキ別パフォーマンス（総合勝率・先攻後攻勝率・得意苦手デッキ）
  - 対戦履歴テーブル（ソート可能）
- **ゲーム環境管理**:
  - 環境（新環境・過去環境）ごとの対戦データ自動振り分け・絞り込み
  - 環境の追加・編集・終了日設定・現在環境（デフォルト）の指定
- **クラス画像管理**:
  - 7クラス（エルフ、ロイヤル、ウィッチ、ドラゴン、ナイトメア、ビショップ、ネメシス）のアイコン画像アップロード・変更
  - デフォルトベクターSVGアイコンへのフォールバック
  - 管理画面と公開画面（`/share`）で共通反映
- **テーマ切り替え**:
  - 4テーマ（ダーク、ホワイト、サイバー、ミスティック）
  - 即時反映＆localStorage永続化（リロード時のちらつき防止SSR最適化）
- **スマートフォン向けUI**:
  - リスト表示／相性マトリクス表示のワンタップ切り替え
  - 画面下部モバイルボトムナビゲーション
  - 44px以上のタッチターゲット
  - 折りたたみ式フィルターパネル

## 起動方法

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。

## Supabase共有モードとマイグレーション

1. Supabaseでプロジェクトを作成する
2. SQL Editorで既存スキーマ（`supabase/schema.sql` または `supabase/public_share.sql`）を実行
3. 今回の追加機能用マイグレーションを実行：
   `supabase/migrations/20261029_add_environments_and_class_icons.sql`
   - `matchup_environments` テーブル（環境管理用）
   - `class_icon_settings` テーブル（クラス画像メタデータ用）
   - `class-icons` Storageバケット（画像アップロード用）
   - RLSポリシーおよびRealtime Publicationの追加
4. `.env.local` に以下を設定：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. `npm run dev` でサーバーを起動

※ Supabase未接続時でも、localStorageフォールバックモードで全機能（環境管理・テーマ切り替え・クラス画像管理・CSV解析・相性集計）が動作します。
