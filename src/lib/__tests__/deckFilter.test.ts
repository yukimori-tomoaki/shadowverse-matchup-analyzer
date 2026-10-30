import assert from "node:assert/strict";
import {
  DEFAULT_MAX_VISIBLE_CHIPS,
  filterDecksByQuery,
  getVisibleChips,
  groupDecksByClass,
  normalizeSelectedDecks,
  removeSingleSelectedDeck,
  serializeSelectedDecks,
} from "../deckFilterUtils";
import { ORDERED_DECKS } from "@/constants/decks";
import { sortDecks } from "../matchupCalculator";

console.log("=== テスト開始: スマートフォン版デッキ絞り込みUI改善 ===");

// 28種類以上のデッキテストデータ作成（ORDERED_DECKS 19種 + 追加9種 = 28種）
const EXTRA_DECKS = [
  "アグロエルフ",
  "コントロールエルフ",
  "財宝ロイヤル",
  "進化ロイヤル",
  "秘術ウィッチ",
  "武装ドラゴン",
  "狂乱ナイトメア",
  "回復ビショップ",
  "人形ネメシス",
];
const TWENTY_EIGHT_DECKS = sortDecks([...ORDERED_DECKS, ...EXTRA_DECKS]);
assert.equal(TWENTY_EIGHT_DECKS.length, 28, "テスト用デッキ一覧が28種類であること");

// 1. 28種類のデッキを問題なくクラス別グループに分類・表示できること
{
  const groups = groupDecksByClass(TWENTY_EIGHT_DECKS);
  assert.equal(groups.length, 7, "7クラスすべてにグループ化されること");
  const totalInGroups = groups.reduce((sum, g) => sum + g.decks.length, 0);
  assert.equal(totalInGroups, 28, "全28種類のデッキが漏れなくクラス別グループに含まれること");
}

// 2. 初期状態（undefined = 全選択）の正規化とチップ省略（「ほか○件」）の検証
{
  const initialSet = normalizeSelectedDecks(TWENTY_EIGHT_DECKS, undefined);
  assert.equal(initialSet.size, 28, "selectedDecks === undefined の場合は全28件が選択状態になること");

  const { visible, hiddenCount } = getVisibleChips(
    TWENTY_EIGHT_DECKS,
    DEFAULT_MAX_VISIBLE_CHIPS
  );
  assert.equal(visible.length, 6, "表示チップ数が上限(6件)に制限されること");
  assert.equal(hiddenCount, 22, "残りの22件が「ほか22件」として算出されること");
}

// 3. デッキの複数選択・検索後の選択状態維持・全選択/全解除の検証
{
  // 初期は全解除状態から3件を複数選択
  const draft = new Set<string>();
  draft.add("テンポエルフ");
  draft.add("海賊ロイヤル");
  draft.add("AFネメシス");
  assert.equal(draft.size, 3);

  // 「ウィッチ」で部分一致検索
  const witchResults = filterDecksByQuery(TWENTY_EIGHT_DECKS, "ウィッチ");
  assert(witchResults.length >= 4, "ウィッチ系デッキが部分一致検索で抽出されること");
  assert(
    witchResults.every((d) => d.includes("ウィッチ")),
    "検索結果がすべてウィッチを含むこと"
  );

  // 検索中に「魔手ウィッチ」を追加選択しても、検索外の3件の選択状態が維持されること
  draft.add("魔手ウィッチ");
  assert(draft.has("テンポエルフ"), "検索中も既存の選択状態（テンポエルフ）が維持されること");
  assert(draft.has("海賊ロイヤル"), "検索中も既存の選択状態（海賊ロイヤル）が維持されること");
  assert(draft.has("AFネメシス"), "検索中も既存の選択状態（AFネメシス）が維持されること");
  assert(draft.has("魔手ウィッチ"), "検索結果から追加したデッキも選択状態になること");
  assert.equal(draft.size, 4);

  // 全選択操作（検索中であっても全28種類が選択される）
  const allSelectedDraft = new Set(TWENTY_EIGHT_DECKS);
  assert.equal(allSelectedDraft.size, 28, "全選択で28件すべてが選択されること");
  assert.equal(
    serializeSelectedDecks(TWENTY_EIGHT_DECKS, allSelectedDraft),
    undefined,
    "全選択状態で適用した場合は既存の仕様通り undefined に正規化されること"
  );

  // 全解除操作
  const clearedDraft = new Set<string>();
  assert.equal(clearedDraft.size, 0);
  assert.deepEqual(
    serializeSelectedDecks(TWENTY_EIGHT_DECKS, clearedDraft),
    [],
    "全解除状態で適用した場合は空配列 [] になること"
  );
}

// 4. キャンセル時に変更が反映されないこと、適用時に相性表の行デッキが正しく更新されること
{
  // 現在の確定状態: 2デッキ選択中
  const committedSelected: string[] | undefined = ["連携ロイヤル", "スペルウィッチ"];

  // ボトムシートを開いてドラフトを作成し、変更を加える
  const draft = normalizeSelectedDecks(TWENTY_EIGHT_DECKS, committedSelected);
  draft.add("ランプドラゴン");
  draft.delete("連携ロイヤル");
  assert.equal(draft.size, 2);

  // キャンセル操作: committedSelected は変更されない
  const afterCancel = normalizeSelectedDecks(TWENTY_EIGHT_DECKS, committedSelected);
  assert.deepEqual(
    Array.from(afterCancel),
    ["連携ロイヤル", "スペルウィッチ"],
    "キャンセル時は変更前の選択状態がそのまま維持されること"
  );

  // 適用操作: ドラフトが確定状態へ変換され、相性表の rowDecks に反映される
  const nextSelectedDecks = serializeSelectedDecks(TWENTY_EIGHT_DECKS, draft);
  assert.deepEqual(nextSelectedDecks, ["スペルウィッチ", "ランプドラゴン"]);

  const rowDecks =
    nextSelectedDecks === undefined
      ? TWENTY_EIGHT_DECKS
      : TWENTY_EIGHT_DECKS.filter((d) => nextSelectedDecks.includes(d));
  assert.deepEqual(
    rowDecks,
    ["スペルウィッチ", "ランプドラゴン"],
    "適用時に相性表の行デッキが選択したデッキのみに更新されること"
  );
}

// 5. 選択済みチップからの個別解除動作
{
  // 全選択状態 (undefined) から「テンポエルフ」1件をチップの×ボタンで解除
  const nextFromAll = removeSingleSelectedDeck(
    TWENTY_EIGHT_DECKS,
    undefined,
    "テンポエルフ"
  );
  assert(Array.isArray(nextFromAll), "1件解除後は配列になること");
  assert.equal(nextFromAll.length, 27, "28件から1件解除されて27件になること");
  assert(!nextFromAll.includes("テンポエルフ"), "解除したテンポエルフが含まれないこと");

  // 2件選択状態から1件を解除
  const nextFromTwo = removeSingleSelectedDeck(
    TWENTY_EIGHT_DECKS,
    ["テンポエルフ", "海賊ロイヤル"],
    "テンポエルフ"
  );
  assert.deepEqual(nextFromTwo, ["海賊ロイヤル"]);
}

console.log("すべてのデッキ絞り込みUI単体テストに合格しました！");

