import { CLASS_ORDER } from "@/constants/decks";
import { getDeckClass } from "@/lib/matchupCalculator";

export const DEFAULT_MAX_VISIBLE_CHIPS = 6;
export const UNCLASSIFIED_GROUP_NAME = "その他";

export interface DeckClassGroup {
  className: string;
  decks: string[];
}

/**
 * 既存の selectedDecks (undefined = 全選択, string[] = 個別選択) を
 * 現在有効なデッキ一覧 items に対する Set<string> に正規化する
 */
export function normalizeSelectedDecks(
  items: readonly string[],
  selectedItems?: readonly string[]
): Set<string> {
  if (selectedItems === undefined) {
    return new Set(items);
  }
  const allowed = new Set(items);
  const result = new Set<string>();
  for (const item of selectedItems) {
    if (allowed.has(item)) {
      result.add(item);
    }
  }
  return result;
}

/**
 * Set<string> の選択状態を既存の MatchFilters.selectedDecks 互換の形式
 * (全選択時は undefined、それ以外は items の並び順を維持した string[]) に変換する
 */
export function serializeSelectedDecks(
  items: readonly string[],
  selectedSet: ReadonlySet<string>
): string[] | undefined {
  if (items.length > 0 && selectedSet.size >= items.length) {
    const allIncluded = items.every((item) => selectedSet.has(item));
    if (allIncluded) {
      return undefined;
    }
  }
  return items.filter((item) => selectedSet.has(item));
}

/**
 * 選択済みチップから特定のデッキ1件を個別解除した次の selectedDecks を返す
 */
export function removeSingleSelectedDeck(
  items: readonly string[],
  selectedItems: readonly string[] | undefined,
  deckToRemove: string
): string[] | undefined {
  const currentSet = normalizeSelectedDecks(items, selectedItems);
  currentSet.delete(deckToRemove);
  return serializeSelectedDecks(items, currentSet);
}

/**
 * デッキ名の部分一致検索（前後空白除去・大文字小文字非区別）
 */
export function filterDecksByQuery(
  items: readonly string[],
  query: string
): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...items];
  }
  return items.filter((deck) => deck.toLowerCase().includes(normalized));
}

/**
 * デッキ一覧をクラス別グループに分類する（空のクラスは除外）
 */
export function groupDecksByClass(
  decks: readonly string[],
  classOrder: readonly string[] = CLASS_ORDER
): DeckClassGroup[] {
  const groupMap = new Map<string, string[]>();
  for (const cls of classOrder) {
    groupMap.set(cls, []);
  }
  groupMap.set(UNCLASSIFIED_GROUP_NAME, []);

  for (const deck of decks) {
    const detected = getDeckClass(deck);
    if (detected && groupMap.has(detected)) {
      groupMap.get(detected)!.push(deck);
    } else {
      groupMap.get(UNCLASSIFIED_GROUP_NAME)!.push(deck);
    }
  }

  const result: DeckClassGroup[] = [];
  for (const [className, list] of groupMap.entries()) {
    if (list.length > 0) {
      result.push({ className, decks: list });
    }
  }
  return result;
}

/**
 * 選択済みチップの表示制限（「ほか○件」の算出）
 */
export function getVisibleChips(
  selectedDecks: readonly string[],
  maxVisible: number = DEFAULT_MAX_VISIBLE_CHIPS
): { visible: string[]; hiddenCount: number } {
  const limit = Math.max(0, maxVisible);
  if (selectedDecks.length <= limit) {
    return {
      visible: [...selectedDecks],
      hiddenCount: 0,
    };
  }
  return {
    visible: selectedDecks.slice(0, limit),
    hiddenCount: selectedDecks.length - limit,
  };
}

