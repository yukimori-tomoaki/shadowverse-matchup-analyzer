import type { MatchRecord, MatchupStats } from "@/types/match";

export const winRate = (wins: number, total: number) => (total === 0 ? 0 : (wins / total) * 100);

export const CLASS_ORDER = [
  "エルフ",
  "ロイヤル",
  "ウィッチ",
  "ドラゴン",
  "ナイトメア",
  "ビショップ",
  "ネメシス",
] as const;

export const ORDERED_DECKS = [
  "テンポエルフ",
  "進化エルフ",
  "連携ロイヤル",
  "海賊ロイヤル",
  "魔手ウィッチ",
  "スペルウィッチ",
  "セフィーウィッチ",
  "ランプドラゴン",
  "フェイスドラゴン",
  "ミッドレンジナイトメア",
  "アグロナイトメア",
  "アミュレットビショップ",
  "進化ビショップ",
  "クキシロビショップ",
  "AFネメシス",
  "ハイランダーネメシス",
  "OTKネメシス",
] as const;

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

export function calculateMatchup(records: MatchRecord[], myDeck: string, opponentDeck: string): MatchupStats {
  const matches = records.filter((record) => record.myDeck === myDeck && record.opponentDeck === opponentDeck);
  const wins = matches.filter((record) => record.result === "WIN").length;
  const firstMatches = matches.filter((record) => record.turn === "先攻");
  const secondMatches = matches.filter((record) => record.turn === "後攻");
  return {
    myDeck, opponentDeck, wins, losses: matches.length - wins, total: matches.length,
    winRate: winRate(wins, matches.length),
    firstWins: firstMatches.filter((record) => record.result === "WIN").length,
    firstTotal: firstMatches.length,
    secondWins: secondMatches.filter((record) => record.result === "WIN").length,
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

export function filterMatches(records: MatchRecord[], period: string, startDate: string, endDate: string, myDeck: string, turn: string) {
  const today = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const periodStart = period === "today" ? iso(today) : period === "7days" ? iso(new Date(today.getTime() - 6 * 86400000)) : period === "30days" ? iso(new Date(today.getTime() - 29 * 86400000)) : "";
  return records.filter((record) => {
    const inPeriod = period === "all" || (period === "custom" ? (!startDate || record.date >= startDate) && (!endDate || record.date < `${endDate}~`) : record.date >= periodStart);
    return inPeriod && (!myDeck || record.myDeck === myDeck) && (turn === "all" || record.turn === turn);
  });
}
