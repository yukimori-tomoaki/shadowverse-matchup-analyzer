import assert from "node:assert/strict";
import {
  MIN_MATCHES_FOR_RANKING,
  calculateWilsonScore,
  calculateWilsonLowerBound,
  calculateLossWilsonLowerBound,
  calculateMatchupRankings,
  getConfidenceInfo,
} from "../matchupCalculator";
import type { MatchRecord } from "@/types/match";

function makeRecords(wins: number, losses: number, myDeck: string, oppDeck: string, envDate = "2026-10-01"): MatchRecord[] {
  const records: MatchRecord[] = [];
  for (let i = 0; i < wins; i++) {
    records.push({
      id: `w-${oppDeck}-${i}`,
      date: envDate,
      format: "ローテーション",
      memo: "",
      turn: i % 2 === 0 ? "先攻" : "後攻",
      result: "WIN",
      myDeck,
      opponentDeck: oppDeck,
    });
  }
  for (let i = 0; i < losses; i++) {
    records.push({
      id: `l-${oppDeck}-${i}`,
      date: envDate,
      format: "ローテーション",
      memo: "",
      turn: i % 2 === 0 ? "先攻" : "後攻",
      result: "LOSS",
      myDeck,
      opponentDeck: oppDeck,
    });
  }
  return records;
}

console.log("=== テスト開始: 得意対面・苦手対面ランキング精度改善 ===");

// 1. 最低対戦回数定数の確認
assert.equal(MIN_MATCHES_FOR_RANKING, 10, "MIN_MATCHES_FOR_RANKING は 10 であること");

// 1.1 Wilsonスコア関数のテスト
const wScore = calculateWilsonScore(10, 20);
assert(wScore.lower < 0.5 && wScore.upper > 0.5, "10/20の信頼区間は0.5を挟むこと");
const lower = calculateWilsonLowerBound(15, 20);
assert(lower > 0.5, "15/20の得意対面Wilson下限は0.5を超えること");
const lossLower = calculateLossWilsonLowerBound(15, 20);
assert(lossLower > 0.5, "15/20の苦手対面Wilson下限は0.5を超えること");

// 2. 信頼度ラベル関数の確認
assert.equal(getConfidenceInfo(1).level, "low");
assert.equal(getConfidenceInfo(1).label, "参考記録");
assert.equal(getConfidenceInfo(10).level, "low");
assert.equal(getConfidenceInfo(10).label, "参考記録");
assert.equal(getConfidenceInfo(11).level, "medium");
assert.equal(getConfidenceInfo(11).label, "中程度");
assert.equal(getConfidenceInfo(20).level, "medium");
assert.equal(getConfidenceInfo(20).label, "中程度");
assert.equal(getConfidenceInfo(21).level, "high");
assert.equal(getConfidenceInfo(21).label, "高い");

// 3. Wilsonスコア計算の単体テスト
const scoreZero = calculateWilsonScore(0, 0);
assert.equal(scoreZero.lower, 0);
assert.equal(scoreZero.upper, 0);

// 4. 要件6の各テストケース検証
// ケースA: 3勝0敗 (対戦回数3 < 10) -> ランキング対象外（参考記録）
{
  const records = makeRecords(3, 0, "海賊ロイヤル", "エルフ");
  const result = calculateMatchupRankings({ records, selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 0, "3勝0敗: 得意対面ランキング対象外であること");
  assert.equal(result.unfavorable.length, 0, "3勝0敗: 苦手対面ランキング対象外であること");
  assert.equal(result.referenceRecords.length, 1, "3勝0敗: 参考記録に含まれること");
  assert.equal(result.referenceRecords[0].opponentDeck, "エルフ");
  assert.match(result.referenceRecords[0].reason, /10戦未満/);
}

// ケースB: 1勝0敗 (対戦回数1 < 10) -> ランキング対象外（参考記録）
{
  const records = makeRecords(1, 0, "海賊ロイヤル", "ウィッチ");
  const result = calculateMatchupRankings({ records, selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 0, "1勝0敗: ランキング対象外");
  assert.equal(result.referenceRecords.length, 1);
  assert.match(result.referenceRecords[0].reason, /10戦未満/);
}

// ケースC: 5勝5敗 (対戦回数10, 勝率50%) -> 五分のためランキング対象外（参考記録）
{
  const records = makeRecords(5, 5, "海賊ロイヤル", "ドラゴン");
  const result = calculateMatchupRankings({ records, selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 0, "5勝5敗: 得意対面ランキング対象外");
  assert.equal(result.unfavorable.length, 0, "5勝5敗: 苦手対面ランキング対象外");
  assert.equal(result.referenceRecords.length, 1, "5勝5敗: 参考記録に含まれる");
  assert.match(result.referenceRecords[0].reason, /勝率五分/);
}

// ケースD: 10戦未満（例: 8戦中2敗=6勝2敗、または7勝2敗=9戦） -> ランキング対象外（参考記録）
{
  const records = makeRecords(6, 2, "海賊ロイヤル", "ネクロ"); // 計8戦 (< 10戦)
  const result = calculateMatchupRankings({ records, selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 0, "10戦未満: ランキング対象外であること");
  assert.equal(result.referenceRecords.length, 1, "参考記録に含まれること");
  assert.match(result.referenceRecords[0].reason, /10戦未満/);
}

// ケースE: 10戦未満（8戦2敗）と 10勝5敗（15戦） -> 前者は対戦回数10未満のため対象外、後者はランキング対象
{
  const rec1 = makeRecords(6, 2, "海賊ロイヤル", "ネクロ"); // 計8戦 (< 10戦)
  const rec2 = makeRecords(10, 5, "海賊ロイヤル", "ビショップ"); // 計15戦 (>= 10戦)
  const result = calculateMatchupRankings({ records: [...rec1, ...rec2], selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 1, "得意対面ランキングは1件のみ");
  assert.equal(result.favored[0].opponentDeck, "ビショップ", "10勝5敗のビショップがランキング対象");
  assert.equal(result.referenceRecords.length, 1);
  assert.equal(result.referenceRecords[0].opponentDeck, "ネクロ", "8戦のネクロは参考記録");
}

// ケースF: 15勝5敗 (20戦, 勝率75%) -> ランキング対象
{
  const records = makeRecords(15, 5, "海賊ロイヤル", "エルフ");
  const result = calculateMatchupRankings({ records, selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 1, "15勝5敗: 得意対面ランキング対象");
  assert.equal(result.favored[0].opponentDeck, "エルフ");
  assert.equal(result.favored[0].confidence.label, "中程度", "20戦は信頼度中程度");
}

// ケースG: 30勝10敗 (40戦, 勝率75%) -> ランキング対象 (15勝5敗よりも信頼性が高く上位)
{
  const rec15 = makeRecords(15, 5, "海賊ロイヤル", "デッキA");
  const rec30 = makeRecords(30, 10, "海賊ロイヤル", "デッキB");
  const result = calculateMatchupRankings({ records: [...rec15, ...rec30], selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 2);
  assert.equal(result.favored[0].opponentDeck, "デッキB", "同じ勝率75%でも40戦のデッキBが1位");
  assert.equal(result.favored[1].opponentDeck, "デッキA", "20戦のデッキAが2位");
  assert.equal(result.favored[0].confidence.label, "高い", "40戦は信頼度高い");
}

// ケースH: 0勝10敗 -> 苦手対面ランキング対象
{
  const records = makeRecords(0, 10, "海賊ロイヤル", "ナイトメア");
  const result = calculateMatchupRankings({ records, selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 0);
  assert.equal(result.unfavorable.length, 1, "0勝10敗: 苦手対面ランキング対象");
  assert.equal(result.unfavorable[0].opponentDeck, "ナイトメア");
  assert.equal(result.unfavorable[0].winRate, 0);
}

// ケースI: 苦手対面における勝率0%同士の対戦回数考慮 (0勝10敗 vs 0勝20敗)
{
  const rec10 = makeRecords(0, 10, "海賊ロイヤル", "デッキX");
  const rec20 = makeRecords(0, 20, "海賊ロイヤル", "デッキY");
  const result = calculateMatchupRankings({ records: [...rec10, ...rec20], selectedDeck: "海賊ロイヤル" });
  assert.equal(result.unfavorable.length, 2);
  assert.equal(result.unfavorable[0].opponentDeck, "デッキY", "同じ勝率0%でも20敗のデッキYがより苦手として1位");
  assert.equal(result.unfavorable[1].opponentDeck, "デッキX", "10敗のデッキXが2位");
}

// ケースJ: 対戦回数が同じ場合の順位決定
{
  const recHigh = makeRecords(16, 4, "海賊ロイヤル", "デッキ勝率80"); // 20戦, 80%
  const recLow = makeRecords(12, 8, "海賊ロイヤル", "デッキ勝率60");  // 20戦, 60%
  const result = calculateMatchupRankings({ records: [...recHigh, ...recLow], selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 2);
  assert.equal(result.favored[0].opponentDeck, "デッキ勝率80");
  assert.equal(result.favored[1].opponentDeck, "デッキ勝率60");
}

// ケースK: 対戦データが存在しない場合
{
  const result = calculateMatchupRankings({ records: [], selectedDeck: "海賊ロイヤル" });
  assert.equal(result.favored.length, 0);
  assert.equal(result.unfavorable.length, 0);
  assert.equal(result.referenceRecords.length, 0);
}

// ケースL: 環境切り替え時のランキング再計算
{
  const envA_matches = makeRecords(12, 3, "海賊ロイヤル", "環境A対面", "2026-09-15"); // 15戦
  const envB_matches = makeRecords(14, 2, "海賊ロイヤル", "環境B対面", "2026-10-15"); // 16戦
  const allRecords = [...envA_matches, ...envB_matches];

  // 環境A (2026-09-01〜2026-09-30)
  const envA_filtered = allRecords.filter((r) => r.date >= "2026-09-01" && r.date <= "2026-09-30");
  const resA = calculateMatchupRankings({ records: envA_filtered, selectedDeck: "海賊ロイヤル" });
  assert.equal(resA.favored.length, 1);
  assert.equal(resA.favored[0].opponentDeck, "環境A対面");

  // 環境B (2026-10-01〜2026-10-31)
  const envB_filtered = allRecords.filter((r) => r.date >= "2026-10-01" && r.date <= "2026-10-31");
  const resB = calculateMatchupRankings({ records: envB_filtered, selectedDeck: "海賊ロイヤル" });
  assert.equal(resB.favored.length, 1);
  assert.equal(resB.favored[0].opponentDeck, "環境B対面");
}

console.log("すべてのユニットテストに合格しました！");

