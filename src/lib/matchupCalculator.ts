import type { MatchRecord, MatchupStats } from "@/types/match";
import { CLASS_ORDER, DEFAULT_SHARE_PERIOD, ORDERED_DECKS } from "@/constants/decks";

// デッキ・クラス定数は src/constants/decks.ts で一元管理しています。
// デッキの追加・編集・削除はそちらのファイルのみ変更してください。
// 後方互換のためここから再エクスポートしています。
export { CLASS_ORDER, DEFAULT_SHARE_PERIOD, ORDERED_DECKS };

export const winRate = (wins: number, total: number) => (total === 0 ? 0 : (wins / total) * 100);

export function getDeckClass(name: string): string | null {
  const trimmed = name.trim();
  for (let i = 0; i < CLASS_ORDER.length; i++) {
    if (trimmed.endsWith(CLASS_ORDER[i])) return CLASS_ORDER[i];
  }
  for (let i = 0; i < CLASS_ORDER.length; i++) {
    if (trimmed.includes(CLASS_ORDER[i])) return CLASS_ORDER[i];
  }
  return null;
}

export function isDeckInClass(deckName: string, className: string): boolean {
  if (!className || className === "all") return true;
  return getDeckClass(deckName) === className;
}

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

export function filterByEnvironment(
  records: MatchRecord[],
  environment?: { startDate: string; endDate: string | null } | null | "all"
): MatchRecord[] {
  if (!environment || environment === "all") return records;
  const start = environment.startDate;
  const end = environment.endDate;
  return records.filter((record) => {
    const matchDate = record.date.slice(0, 10);
    if (start && matchDate < start) return false;
    if (end && matchDate > end) return false;
    return true;
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

/**
 * 最大連勝数を計算
 */
export function calculateMaxStreak(records: MatchRecord[]): number {
  if (records.length === 0) return 0;
  // 日付順にソート（昇順）
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let maxStreak = 0;
  let currentStreak = 0;

  for (const record of sorted) {
    if (record.result === "WIN") {
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

export type DeckUsageStat = {
  deckName: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
};

/**
 * 自分が使用したデッキごとの使用回数・勝率を計算
 */
export function calculateDeckUsageStats(records: MatchRecord[]): DeckUsageStat[] {
  const map = new Map<string, { total: number; wins: number; losses: number }>();

  for (const r of records) {
    if (!r.myDeck) continue;
    const current = map.get(r.myDeck) ?? { total: 0, wins: 0, losses: 0 };
    current.total += 1;
    if (r.result === "WIN") current.wins += 1;
    else current.losses += 1;
    map.set(r.myDeck, current);
  }

  const list = Array.from(map.entries()).map(([deckName, stat]) => ({
    deckName,
    total: stat.total,
    wins: stat.wins,
    losses: stat.losses,
    winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
    rank: 1,
  }));

  // 使用数降順、同じなら勝率降順
  list.sort((a, b) => b.total - a.total || b.winRate - a.winRate);

  let currentRank = 1;
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i].total < list[i - 1].total) {
      currentRank = i + 1;
    }
    list[i].rank = currentRank;
  }

  return list;
}

export type OpponentShareStat = {
  deckName: string;
  total: number;
  sharePercent: number;
  rank: number;
};

/**
 * 対戦相手デッキの環境シェア率を計算
 */
export function calculateOpponentShare(records: MatchRecord[]): OpponentShareStat[] {
  const totalMatches = records.length;
  if (totalMatches === 0) return [];

  const map = new Map<string, number>();
  for (const r of records) {
    if (!r.opponentDeck) continue;
    map.set(r.opponentDeck, (map.get(r.opponentDeck) ?? 0) + 1);
  }

  const list = Array.from(map.entries()).map(([deckName, count]) => ({
    deckName,
    total: count,
    sharePercent: (count / totalMatches) * 100,
    rank: 1,
  }));

  list.sort((a, b) => b.total - a.total);

  let currentRank = 1;
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i].total < list[i - 1].total) {
      currentRank = i + 1;
    }
    list[i].rank = currentRank;
  }

  return list;
}

/**
 * 得意対面・苦手対面のランキング対象となる最低対戦回数
 */
export const MIN_MATCHES_FOR_RANKING = 10;

/**
 * 対戦回数に基づく信頼度レベル
 */
export type ConfidenceLevel = "low" | "medium" | "high";

export interface ConfidenceInfo {
  level: ConfidenceLevel;
  label: string;
  note: string;
  description: string;
}

/**
 * 対戦回数に応じた信頼度情報の取得
 * - 1〜10戦: 参考記録
 * - 11〜20戦: 中程度
 * - 21戦以上: 高い
 */
export function getConfidenceInfo(totalMatches: number): ConfidenceInfo {
  if (totalMatches <= 10) {
    const note = "対戦回数10戦以下のため参考記録（目安）です";
    return {
      level: "low",
      label: "参考記録",
      note,
      description: note,
    };
  }
  if (totalMatches <= 20) {
    const note = "対戦回数11〜20戦に基づく目安です";
    return {
      level: "medium",
      label: "中程度",
      note,
      description: note,
    };
  }
  const note = "対戦回数21戦以上に基づく目安です";
  return {
    level: "high",
    label: "高い",
    note,
    description: note,
  };
}

/**
 * ウィルソンの信頼区間 (Wilson score interval) の下限・上限を計算
 * @param wins 成功数（勝利数など）
 * @param total 試行回数（対戦数）
 * @param z 信頼水準の z 値 (デフォルト: 1.96 = 95%信頼区間)
 */
export function calculateWilsonScore(
  wins: number,
  total: number,
  z: number = 1.96
): { lower: number; upper: number } {
  if (total <= 0) {
    return { lower: 0, upper: 0 };
  }

  const p = Math.max(0, Math.min(1, wins / total));
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);

  const lower = Math.max(0, (center - spread) / denominator);
  const upper = Math.min(1, (center + spread) / denominator);

  return { lower, upper };
}

/**
 * 得意対面向けの Wilson score lower bound を計算
 * 勝率が統計的に高いと期待できる下限スコア (0〜1)
 */
export function calculateWilsonLowerBound(wins: number, total: number, z: number = 1.96): number {
  return calculateWilsonScore(wins, total, z).lower;
}

/**
 * 苦手対面向けのスコアを計算
 * 敗北率（losses / total）の Wilson score lower bound (0〜1)
 * スコアが高いほど「統計的に確実に負けやすい（苦手）」と判定される
 */
export function calculateLossWilsonLowerBound(losses: number, total: number, z: number = 1.96): number {
  return calculateWilsonScore(losses, total, z).lower;
}

/**
 * 特定の相手デッキに対する全体戦績を集計（全デッキ合計用）
 */
export function calculateOverallMatchup(
  records: MatchRecord[],
  opponentDeck: string,
  turnFilter: string = "all"
): MatchupStats {
  const matchingRecords = records.filter((r) => r.opponentDeck === opponentDeck);

  const filtered =
    turnFilter === "all"
      ? matchingRecords
      : matchingRecords.filter((r) => r.turn === turnFilter);

  const wins = filtered.filter((r) => r.result === "WIN").length;
  const total = filtered.length;
  const losses = total - wins;

  const firstMatches = matchingRecords.filter((r) => r.turn === "先攻");
  const firstWins = firstMatches.filter((r) => r.result === "WIN").length;

  const secondMatches = matchingRecords.filter((r) => r.turn === "後攻");
  const secondWins = secondMatches.filter((r) => r.result === "WIN").length;

  return {
    myDeck: "全デッキ合計",
    opponentDeck,
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

export interface RankedMatchupItem {
  opponentDeck: string;
  stats: MatchupStats;
  winRate: number;
  total: number;
  wins: number;
  losses: number;
  score: number; // Wilson score lower bound
  rank: number;
  confidence: ConfidenceInfo;
}

export interface ExcludedMatchupItem {
  opponentDeck: string;
  stats: MatchupStats;
  winRate: number;
  total: number;
  wins: number;
  losses: number;
  reason: string; // ランキング対象外である理由
  confidence: ConfidenceInfo;
}

export interface MatchupRankingResult {
  favored: RankedMatchupItem[];
  unfavorable: RankedMatchupItem[];
  referenceRecords: ExcludedMatchupItem[];
}

export interface CalculateRankingOptions {
  records: MatchRecord[];
  selectedDeck?: string;
  turnFilter?: string;
  minMatches?: number;
}

/**
 * 得意対面・苦手対面および参考記録の精密ランキングを計算
 */
export function calculateMatchupRankings(
  options: CalculateRankingOptions
): MatchupRankingResult {
  const {
    records,
    selectedDeck = "",
    turnFilter = "all",
    minMatches = MIN_MATCHES_FOR_RANKING,
  } = options;

  // 対戦相手デッキの一覧を抽出
  const opponentDecks = getOpponentDecks(records);

  const favoredCandidates: Array<{
    opponentDeck: string;
    stats: MatchupStats;
    winRate: number;
    total: number;
    wins: number;
    losses: number;
    score: number;
  }> = [];

  const unfavorableCandidates: Array<{
    opponentDeck: string;
    stats: MatchupStats;
    winRate: number;
    total: number;
    wins: number;
    losses: number;
    score: number;
  }> = [];

  const referenceRecords: ExcludedMatchupItem[] = [];

  for (const opp of opponentDecks) {
    if (selectedDeck && opp === selectedDeck) continue;

    const stats = selectedDeck
      ? calculateMatchup(records, selectedDeck, opp, turnFilter)
      : calculateOverallMatchup(records, opp, turnFilter);

    if (stats.total === 0) continue;

    const total = stats.total;
    const wins = stats.wins;
    const losses = stats.losses;
    const rate = stats.winRate;
    const confidence = getConfidenceInfo(total);

    // 1. 最低対戦回数未満の場合：参考記録
    if (total < minMatches) {
      referenceRecords.push({
        opponentDeck: opp,
        stats,
        winRate: rate,
        total,
        wins,
        losses,
        reason: `対戦数不足（${minMatches}戦未満）`,
        confidence,
      });
      continue;
    }

    // 2. 対戦回数が10戦以上ある場合
    if (wins > losses) {
      // 勝ち越し：得意対面候補 (勝率 Wilson lower bound)
      const score = calculateWilsonLowerBound(wins, total);
      favoredCandidates.push({
        opponentDeck: opp,
        stats,
        winRate: rate,
        total,
        wins,
        losses,
        score,
      });
    } else if (wins < losses) {
      // 負け越し：苦手対面候補 (敗北率 Wilson lower bound)
      const score = calculateLossWilsonLowerBound(losses, total);
      unfavorableCandidates.push({
        opponentDeck: opp,
        stats,
        winRate: rate,
        total,
        wins,
        losses,
        score,
      });
    } else {
      // wins === losses（五分）：得意でも苦手でもないためランキング対象外
      referenceRecords.push({
        opponentDeck: opp,
        stats,
        winRate: rate,
        total,
        wins,
        losses,
        reason: "勝率五分（得意・苦手判定なし）",
        confidence,
      });
    }
  }

  // 得意対面のソート: Wilson lower bound 降順 → total 降順 → winRate 降順 → wins 降順
  favoredCandidates.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 1e-6) return b.score - a.score;
    if (b.total !== a.total) return b.total - a.total;
    if (Math.abs(b.winRate - a.winRate) > 1e-6) return b.winRate - a.winRate;
    return b.wins - a.wins;
  });

  // 苦手対面のソート: 敗北率 Wilson lower bound 降順 → total 降順 → winRate 昇順 → losses 降順
  unfavorableCandidates.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 1e-6) return b.score - a.score;
    if (b.total !== a.total) return b.total - a.total;
    if (Math.abs(a.winRate - b.winRate) > 1e-6) return a.winRate - b.winRate;
    return b.losses - a.losses;
  });

  // 参考記録のソート: total 降順 → winRate 降順
  referenceRecords.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.winRate - a.winRate;
  });

  // 順位付与（同スコア時は同順位も考慮可能だが、表示用に 1, 2, ... の順位を付ける）
  const favored: RankedMatchupItem[] = favoredCandidates.map((c, index) => ({
    ...c,
    rank: index + 1,
    confidence: getConfidenceInfo(c.total),
  }));

  const unfavorable: RankedMatchupItem[] = unfavorableCandidates.map((c, index) => ({
    ...c,
    rank: index + 1,
    confidence: getConfidenceInfo(c.total),
  }));

  return {
    favored,
    unfavorable,
    referenceRecords,
  };
}


/**
 * 「その他」統合ラベル・しきい値・カラー・ドーナツ描画定数
 */
export const OTHER_DECK_LABEL = "その他";
export const OTHER_THRESHOLD_PERCENT = 2; // 構成比2%未満のデッキを統合
export const OTHER_DECK_COLOR = "#64748b"; // 既存のクラスカラーと区別しやすいニュートラルカラー
export const DONUT_GAP_DEGREES = 1.8; // 区切り幅目安（1.5〜2度）
export const MIN_DONUT_SEGMENT_DEGREES = 2.0; // 少数データの区画が消えないための最小角度

export const DECK_CLASS_COLORS: Record<string, string> = {
  エルフ: "#10b981",
  ロイヤル: "#eab308",
  ウィッチ: "#a855f7",
  ドラゴン: "#f97316",
  ナイトメア: "#ec4899",
  ネクロマンサー: "#ec4899",
  ヴァンパイア: "#e11d48",
  ビショップ: "#38bdf8",
  ネメシス: "#06b6d4",
  ニュートラル: "#94a3b8",
};

export function getDeckColor(name: string): string {
  if (name === OTHER_DECK_LABEL) return OTHER_DECK_COLOR;
  for (const [cls, color] of Object.entries(DECK_CLASS_COLORS)) {
    if (name.includes(cls)) return color;
  }
  return "#38bdf8";
}

export interface OpponentDeckDistributionItem {
  deck: string;
  count: number;
  percent: number;
  color: string;
  isOther?: boolean;
  breakdown?: OpponentDeckDistributionItem[];
}

export interface DonutSegmentItem extends OpponentDeckDistributionItem {
  rawStartAngle: number;
  rawEndAngle: number;
  startAngle: number;
  endAngle: number;
  gapDegrees: number;
}

export interface OpponentDistributionResult {
  totalMatches: number;
  items: OpponentDeckDistributionItem[];
  segments: DonutSegmentItem[];
  otherBreakdown: OpponentDeckDistributionItem[];
  rawItems: OpponentDeckDistributionItem[];
}

export interface CalculateOpponentDistributionOptions {
  selectedDeck?: string;
  thresholdPercent?: number;
  gapDegrees?: number;
  minSegmentDegrees?: number;
}

/**
 * 対戦相手のデッキ分布を計算（構成比2%未満の「その他」統合・12時開始時計回り角度計算付き）
 */
export function calculateOpponentDistribution(
  records: MatchRecord[],
  options: CalculateOpponentDistributionOptions = {}
): OpponentDistributionResult {
  const {
    selectedDeck = "",
    thresholdPercent = OTHER_THRESHOLD_PERCENT,
    gapDegrees = DONUT_GAP_DEGREES,
    minSegmentDegrees = MIN_DONUT_SEGMENT_DEGREES,
  } = options;

  const filtered = selectedDeck
    ? records.filter((r) => r.myDeck === selectedDeck && Boolean(r.opponentDeck))
    : records.filter((r) => Boolean(r.opponentDeck));

  const totalMatches = filtered.length;
  if (totalMatches === 0) {
    return {
      totalMatches: 0,
      items: [],
      segments: [],
      otherBreakdown: [],
      rawItems: [],
    };
  }

  const countMap = new Map<string, number>();
  for (const r of filtered) {
    countMap.set(r.opponentDeck, (countMap.get(r.opponentDeck) ?? 0) + 1);
  }

  const orderedIndex = new Map<string, number>(
    ORDERED_DECKS.map((name, index) => [name, index])
  );

  // 対戦数の多い順（降順）にソート
  const rawItems: OpponentDeckDistributionItem[] = Array.from(countMap.entries())
    .filter(([, count]) => count > 0)
    .map(([deck, count]) => ({
      deck,
      count,
      percent: (count / totalMatches) * 100,
      color: getDeckColor(deck),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const classA = getDeckClassIndex(a.deck);
      const classB = getDeckClassIndex(b.deck);
      if (classA !== classB) return classA - classB;
      const aIdx = orderedIndex.get(a.deck);
      const bIdx = orderedIndex.get(b.deck);
      if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
      if (aIdx !== undefined) return -1;
      if (bIdx !== undefined) return 1;
      return a.deck.localeCompare(b.deck, "ja");
    });

  const majorItems: OpponentDeckDistributionItem[] = [];
  const otherBreakdown: OpponentDeckDistributionItem[] = [];

  for (const item of rawItems) {
    if (item.percent < thresholdPercent) {
      otherBreakdown.push(item);
    } else {
      majorItems.push(item);
    }
  }

  const items: OpponentDeckDistributionItem[] = [...majorItems];
  if (otherBreakdown.length > 0) {
    const otherCount = otherBreakdown.reduce((sum, item) => sum + item.count, 0);
    const otherPercent = (otherCount / totalMatches) * 100;
    items.push({
      deck: OTHER_DECK_LABEL,
      count: otherCount,
      percent: otherPercent,
      color: OTHER_DECK_COLOR,
      isOther: true,
      breakdown: otherBreakdown,
    });
  }

  const n = items.length;
  if (n === 0) {
    return { totalMatches, items, segments: [], otherBreakdown, rawItems };
  }

  if (n === 1) {
    const only = items[0];
    return {
      totalMatches,
      items,
      segments: [
        {
          ...only,
          rawStartAngle: 0,
          rawEndAngle: 360,
          startAngle: 0,
          endAngle: 360,
          gapDegrees: 0,
        },
      ],
      otherBreakdown,
      rawItems,
    };
  }

  const effectiveGap = Math.min(gapDegrees, 120 / n);
  const totalGapAngle = n * effectiveGap;
  const availableAngle = 360 - totalGapAngle;

  const rawSpans = items.map((item) => (item.count / totalMatches) * availableAngle);
  const clampedSpans = [...rawSpans];
  let deficit = 0;
  let adjustableTotal = 0;

  for (let i = 0; i < n; i++) {
    if (clampedSpans[i] < minSegmentDegrees) {
      deficit += minSegmentDegrees - clampedSpans[i];
      clampedSpans[i] = minSegmentDegrees;
    } else {
      adjustableTotal += clampedSpans[i] - minSegmentDegrees;
    }
  }

  if (deficit > 0 && adjustableTotal > 0) {
    for (let i = 0; i < n; i++) {
      const extra = clampedSpans[i] - minSegmentDegrees;
      if (extra > 0) {
        clampedSpans[i] -= deficit * (extra / adjustableTotal);
      }
    }
  }

  let rawCursor = 0;
  let visualCursor = 0;
  const segments: DonutSegmentItem[] = items.map((item, idx) => {
    const rawSpan = (item.count / totalMatches) * 360;
    const rawStartAngle = rawCursor;
    const rawEndAngle = rawCursor + rawSpan;
    rawCursor = rawEndAngle;

    const visualSpan = clampedSpans[idx];
    const startAngle = visualCursor;
    const endAngle = visualCursor + visualSpan;
    visualCursor = endAngle + effectiveGap;

    return {
      ...item,
      rawStartAngle,
      rawEndAngle,
      startAngle,
      endAngle,
      gapDegrees: effectiveGap,
    };
  });

  return {
    totalMatches,
    items,
    segments,
    otherBreakdown,
    rawItems,
  };
}

/**
 * 12時方向を0度とし、時計回りの角度（度）からSVG座標を算出
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(angleInRadians),
    y: cy - radius * Math.cos(angleInRadians),
  };
}

/**
 * ドーナツグラフの扇形（環状セクター）SVGパスを生成
 */
export function describeDonutSegmentPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const span = endAngle - startAngle;
  if (span <= 0) return "";

  if (span >= 359.99) {
    return [
      `M ${cx} ${cy - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy + outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${cx} ${cy - outerRadius}`,
      "Z",
      `M ${cx} ${cy - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy + innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius}`,
      "Z",
    ].join(" ");
  }

  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = span > 180 ? 1 : 0;

  return [
    `M ${outerStart.x.toFixed(3)} ${outerStart.y.toFixed(3)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x.toFixed(3)} ${outerEnd.y.toFixed(3)}`,
    `L ${innerEnd.x.toFixed(3)} ${innerEnd.y.toFixed(3)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x.toFixed(3)} ${innerStart.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}
