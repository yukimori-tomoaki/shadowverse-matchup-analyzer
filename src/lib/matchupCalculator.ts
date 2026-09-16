import type { MatchRecord, MatchupStats } from "@/types/match";
import { CLASS_ORDER, ORDERED_DECKS } from "@/constants/decks";

// デッキ・クラス定数は src/constants/decks.ts で一元管理しています。
// デッキの追加・編集・削除はそちらのファイルのみ変更してください。
// 後方互換のためここから再エクスポートしています。
export { CLASS_ORDER, ORDERED_DECKS };

export const winRate = (wins: number, total: number) => (total === 0 ? 0 : (wins / total) * 100);

export function getDeckClassIndex(name: string): number {
  const trimmed = name.trim();
  for (let i = 0; i < CLASS_ORDER.length; i++) {
    if (trimmed.endsWith(CLASS_ORDER[i])) return i;
  }
  for (let i = 0; i < CLASS_ORDER.length; i++) {
    if (trimmed.includes(CLASS_ORDER[i])) return i;
  }
  return 999;
}

export function sortDecks(decks: string[]): string[] {
  const orderedIndex = new Map<string, number>(ORDERED_DECKS.map((name, index) => [name, index]));
  return [...decks].sort((a, b) => {
    const classA = getDeckClassIndex(a);
    const classB = getDeckClassIndex(b);
    if (classA !== classB) return classA - classB;

    const aIdx = orderedIndex.get(a);
    const bIdx = orderedIndex.get(b);
    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
    if (aIdx !== undefined) return -1;
    if (bIdx !== undefined) return 1;
    return a.localeCompare(b, "ja");
  });
}

export function getDecks(records: MatchRecord[]): string[] {
  const existing = Array.from(new Set(records.flatMap((record) => [record.myDeck, record.opponentDeck])));
  return sortDecks(existing);
}

export function getMyDecks(records: MatchRecord[]): string[] {
  const myDecks = Array.from(new Set(records.map((record) => record.myDeck).filter(Boolean)));
  return sortDecks(myDecks);
}

export function getOpponentDecks(records: MatchRecord[]): string[] {
  const opponentDecks = Array.from(new Set(records.map((record) => record.opponentDeck).filter(Boolean)));
  return sortDecks(opponentDecks);
}

export function calculateMatchup(
  records: MatchRecord[],
  deckA: string,
  deckB: string,
  turnFilter: string = "all"
): MatchupStats {
  // deckA vs deckB の直接対決を双方向から抽出
  // 1. 記録者が deckA を使用し、相手が deckB
  const forwardMatches = records.filter(
    (record) => record.myDeck === deckA && record.opponentDeck === deckB
  );
  // 2. 記録者が deckB を使用し、相手が deckA（裏返し）
  const reverseMatches = records.filter(
    (record) => record.myDeck === deckB && record.opponentDeck === deckA
  );

  type NormalizedItem = {
    turn: "先攻" | "後攻" | string;
    isWin: boolean;
  };

  const normalized: NormalizedItem[] = [];

  for (const r of forwardMatches) {
    normalized.push({
      turn: r.turn,
      isWin: r.result === "WIN",
    });
  }

  for (const r of reverseMatches) {
    // 相手が先攻なら deckA 視点では後攻、相手が後攻なら deckA 視点では先攻
    const reversedTurn =
      r.turn === "先攻" ? "後攻" : r.turn === "後攻" ? "先攻" : r.turn;
    // 相手の LOSS は deckA の WIN、相手の WIN は deckA の LOSS
    normalized.push({
      turn: reversedTurn,
      isWin: r.result === "LOSS",
    });
  }

  // 手番フィルターが指定されている場合は絞り込み
  const matches =
    turnFilter === "all"
      ? normalized
      : normalized.filter((m) => m.turn === turnFilter);

  const wins = matches.filter((m) => m.isWin).length;
  const total = matches.length;
  const losses = total - wins;

  // 先攻/後攻別内訳（常に全手番での内訳を集計）
  const firstMatches = normalized.filter((m) => m.turn === "先攻");
  const firstWins = firstMatches.filter((m) => m.isWin).length;
  const firstTotal = firstMatches.length;

  const secondMatches = normalized.filter((m) => m.turn === "後攻");
  const secondWins = secondMatches.filter((m) => m.isWin).length;
  const secondTotal = secondMatches.length;

  return {
    myDeck: deckA,
    opponentDeck: deckB,
    wins,
    losses,
    total,
    winRate: winRate(wins, total),
    firstWins,
    firstTotal,
    secondWins,
    secondTotal,
  };
}

export function calculateDeckTotalStats(
  records: MatchRecord[],
  deck: string,
  turnFilter: string = "all"
) {
  const forwardMatches = records.filter((r) => r.myDeck === deck);
  const reverseMatches = records.filter((r) => r.opponentDeck === deck);

  type NormalizedItem = {
    turn: "先攻" | "後攻" | string;
    isWin: boolean;
  };

  const normalized: NormalizedItem[] = [];

  for (const r of forwardMatches) {
    normalized.push({
      turn: r.turn,
      isWin: r.result === "WIN",
    });
  }

  for (const r of reverseMatches) {
    const reversedTurn =
      r.turn === "先攻" ? "後攻" : r.turn === "後攻" ? "先攻" : r.turn;
    normalized.push({
      turn: reversedTurn,
      isWin: r.result === "LOSS",
    });
  }

  const matches =
    turnFilter === "all"
      ? normalized
      : normalized.filter((m) => m.turn === turnFilter);

  const wins = matches.filter((m) => m.isWin).length;
  const total = matches.length;
  const losses = total - wins;

  const firstMatches = normalized.filter((m) => m.turn === "先攻");
  const firstWins = firstMatches.filter((m) => m.isWin).length;
  const secondMatches = normalized.filter((m) => m.turn === "後攻");
  const secondWins = secondMatches.filter((m) => m.isWin).length;

  return {
    wins,
    losses,
    total,
    winRate: winRate(wins, total),
    firstWins,
    firstTotal: firstMatches.length,
    secondWins,
    secondTotal: secondMatches.length,
  };
}

export function matchupTone(rate: number, total: number) {
  if (total < 5) return { label: "データ不足", tone: "muted" };
  if (rate >= 60) return { label: "大幅有利", tone: "strong-win" };
  if (rate >= 55) return { label: "有利", tone: "win" };
  if (rate >= 45) return { label: "五分", tone: "even" };
  if (rate >= 40) return { label: "不利", tone: "loss" };
  return { label: "大幅不利", tone: "strong-loss" };
}

export function filterPeriod(
  records: MatchRecord[],
  period: string,
  startDate: string,
  endDate: string
) {
  const today = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const periodStart =
    period === "today"
      ? iso(today)
      : period === "7days"
      ? iso(new Date(today.getTime() - 6 * 86400000))
      : period === "30days"
      ? iso(new Date(today.getTime() - 29 * 86400000))
      : "";
  return records.filter((record) => {
    return (
      period === "all" ||
      (period === "custom"
        ? (!startDate || record.date >= startDate) &&
          (!endDate || record.date < `${endDate}~`)
        : record.date >= periodStart)
    );
  });
}

export function filterMatches(
  records: MatchRecord[],
  period: string,
  startDate: string,
  endDate: string,
  myDeck: string,
  turn: string
) {
  const inPeriodRecords = filterPeriod(records, period, startDate, endDate);
  return inPeriodRecords.filter((record) => {
    return (
      (!myDeck || record.myDeck === myDeck) &&
      (turn === "all" || record.turn === turn)
    );
  });
}
