import assert from "node:assert/strict";
import {
  DONUT_GAP_DEGREES,
  MIN_DONUT_SEGMENT_DEGREES,
  OTHER_DECK_COLOR,
  OTHER_DECK_LABEL,
  OTHER_THRESHOLD_PERCENT,
  calculateDeckTotalStats,
  calculateMatchupRankings,
  calculateOpponentDistribution,
  describeDonutSegmentPath,
  filterByEnvironment,
  filterPeriod,
  polarToCartesian,
} from "../matchupCalculator";
import type { MatchRecord } from "@/types/match";

function makeMatches(
  count: number,
  myDeck: string,
  opponentDeck: string,
  date = "2026-10-20"
): MatchRecord[] {
  const list: MatchRecord[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: `${myDeck}-${opponentDeck}-${date}-${i}`,
      date,
      format: "ローテーション",
      myDeck,
      opponentDeck,
      turn: i % 2 === 0 ? "先攻" : "後攻",
      result: i % 2 === 0 ? "WIN" : "LOSS",
      memo: "",
    });
  }
  return list;
}

console.log("=== テスト開始: デッキ相性データ・ドーナツグラフ改善 ===");

// 1. 12時方向開始・時計回り座標の検証
{
  const cx = 70;
  const cy = 70;
  const r = 62;

  // 0度 = 12時方向 (x=70, y=8)
  const p0 = polarToCartesian(cx, cy, r, 0);
  assert(Math.abs(p0.x - 70) < 1e-6, "0度のX座標は中心と同じ70であること");
  assert(Math.abs(p0.y - 8) < 1e-6, "0度のY座標は上端(12時方向)の8であること");

  // 90度 = 3時方向 (x=132, y=70)
  const p90 = polarToCartesian(cx, cy, r, 90);
  assert(Math.abs(p90.x - 132) < 1e-6, "90度のX座標は右端(3時方向)の132であること");
  assert(Math.abs(p90.y - 70) < 1e-6, "90度のY座標は中心と同じ70であること");

  // 180度 = 6時方向 (x=70, y=132)
  const p180 = polarToCartesian(cx, cy, r, 180);
  assert(Math.abs(p180.x - 70) < 1e-6, "180度のX座標は70であること");
  assert(Math.abs(p180.y - 132) < 1e-6, "180度のY座標は下端(6時方向)の132であること");

  // 270度 = 9時方向 (x=8, y=70)
  const p270 = polarToCartesian(cx, cy, r, 270);
  assert(Math.abs(p270.x - 8) < 1e-6, "270度のX座標は左端(9時方向)の8であること");
  assert(Math.abs(p270.y - 70) < 1e-6, "270度のY座標は70であること");
}

// 2. データの並び順（対戦数の多い順）・12時方向開始・集計値の不変性
{
  const records = [
    ...makeMatches(15, "海賊ロイヤル", "魔手ウィッチ"),
    ...makeMatches(40, "海賊ロイヤル", "ランプドラゴン"),
    ...makeMatches(25, "海賊ロイヤル", "AFネメシス"),
    ...makeMatches(20, "海賊ロイヤル", "進化ビショップ"),
  ];
  const dist = calculateOpponentDistribution(records);
  assert.equal(dist.totalMatches, 100);
  assert.equal(dist.segments.length, 4);

  // 対戦数の多い順
  assert.equal(dist.segments[0].deck, "ランプドラゴン");
  assert.equal(dist.segments[0].count, 40);
  assert.equal(dist.segments[1].deck, "AFネメシス");
  assert.equal(dist.segments[1].count, 25);
  assert.equal(dist.segments[2].deck, "進化ビショップ");
  assert.equal(dist.segments[2].count, 20);
  assert.equal(dist.segments[3].deck, "魔手ウィッチ");
  assert.equal(dist.segments[3].count, 15);

  // 最初のセグメントが12時方向(0度)から開始され、時計回りに増加すること
  assert.equal(dist.segments[0].startAngle, 0, "最初のセグメントは0度(12時方向)から始まること");
  for (let i = 0; i < dist.segments.length; i++) {
    assert(
      dist.segments[i].endAngle > dist.segments[i].startAngle,
      "各セグメントは時計回りに正の角度幅を持つこと"
    );
    if (i > 0) {
      const gap = dist.segments[i].startAngle - dist.segments[i - 1].endAngle;
      assert(
        Math.abs(gap - DONUT_GAP_DEGREES) < 1e-6,
        `隣接セグメント間の隙間が${DONUT_GAP_DEGREES}度（1.5〜2度目安）であること`
      );
    }
  }

  // 入力レコードの順序を逆にしても集計値が変わらないこと
  const reversedDist = calculateOpponentDistribution([...records].reverse());
  assert.equal(reversedDist.totalMatches, dist.totalMatches);
  assert.deepEqual(
    reversedDist.items.map((x) => ({ deck: x.deck, count: x.count, percent: x.percent })),
    dist.items.map((x) => ({ deck: x.deck, count: x.count, percent: x.percent }))
  );
}

// 3. 少数データ（構成比2%未満）の「その他」への統合・内訳・合計一致
{
  // 合計100戦:
  // 45戦(45%), 30戦(30%), 20戦(20%), 2戦(2.0% -> 統合対象外), 1戦(1% -> その他), 1戦(1% -> その他), 1戦(1% -> その他)
  const records = [
    ...makeMatches(45, "連携ロイヤル", "テンポエルフ"),
    ...makeMatches(30, "連携ロイヤル", "海賊ロイヤル"),
    ...makeMatches(20, "連携ロイヤル", "スペルウィッチ"),
    ...makeMatches(2, "連携ロイヤル", "ランプドラゴン"), // 2.0%ちょうど -> 個別表示
    ...makeMatches(1, "連携ロイヤル", "アグロナイトメア"), // 1.0% (< 2%) -> その他
    ...makeMatches(1, "連携ロイヤル", "進化ビショップ"), // 1.0% (< 2%) -> その他
    ...makeMatches(1, "連携ロイヤル", "OTKネメシス"), // 1.0% (< 2%) -> その他
  ];

  const dist = calculateOpponentDistribution(records);
  assert.equal(dist.totalMatches, 100);
  assert.equal(OTHER_THRESHOLD_PERCENT, 2);

  // 表示項目: 4デッキ + その他 = 5項目
  assert.equal(dist.items.length, 5);
  assert.equal(dist.items[0].deck, "テンポエルフ");
  assert.equal(dist.items[1].deck, "海賊ロイヤル");
  assert.equal(dist.items[2].deck, "スペルウィッチ");
  assert.equal(dist.items[3].deck, "ランプドラゴン");
  assert.equal(dist.items[4].deck, OTHER_DECK_LABEL);
  assert.equal(dist.items[4].isOther, true);
  assert.equal(dist.items[4].color, OTHER_DECK_COLOR);

  // 「その他」の件数・割合が正しいこと (1 + 1 + 1 = 3戦, 3.0%)
  assert.equal(dist.items[4].count, 3);
  assert(Math.abs(dist.items[4].percent - 3.0) < 1e-6);

  // 「その他」の内訳が3デッキであり、合計が一致すること
  assert.equal(dist.otherBreakdown.length, 3);
  const breakdownSum = dist.otherBreakdown.reduce((s, x) => s + x.count, 0);
  assert.equal(breakdownSum, dist.items[4].count);

  // 全表示セグメントの合計対戦数と中央の総対戦数が一致すること
  const segmentCountSum = dist.segments.reduce((s, x) => s + x.count, 0);
  assert.equal(segmentCountSum, dist.totalMatches);
}

// 4. 少数データの区画が消えないことの検証（その他が0.5%などの極小割合でも最小角度を確保）
{
  const records = [
    ...makeMatches(199, "連携ロイヤル", "テンポエルフ"), // 99.5%
    ...makeMatches(1, "連携ロイヤル", "海賊ロイヤル"), // 0.5% -> その他
  ];
  const dist = calculateOpponentDistribution(records);
  assert.equal(dist.segments.length, 2);
  const otherSeg = dist.segments[1];
  assert.equal(otherSeg.deck, OTHER_DECK_LABEL);
  const span = otherSeg.endAngle - otherSeg.startAngle;
  assert(
    span >= MIN_DONUT_SEGMENT_DEGREES - 1e-6,
    `極小データの区画も消えずに最小角度(${MIN_DONUT_SEGMENT_DEGREES}度)以上が確保されること (実際: ${span}度)`
  );
  const path = describeDonutSegmentPath(70, 70, 46, 62, otherSeg.startAngle, otherSeg.endAngle);
  assert(path.startsWith("M ") && path.endsWith("Z"), "有効なSVGパスが生成されること");
}

// 5. フィルター適用後の集計結果に対して少数データ判定が行われること
{
  // 全デッキ合計では 100戦中 1戦 (1% < 2%) の相手デッキでも、
  // 特定の使用デッキで絞り込むと 10戦中 1戦 (10% >= 2%) になり個別表示されるケース
  const records = [
    ...makeMatches(90, "デッキA", "テンポエルフ", "2026-10-20"),
    ...makeMatches(9, "デッキB", "海賊ロイヤル", "2026-10-25"),
    ...makeMatches(1, "デッキB", "OTKネメシス", "2026-10-25"),
  ];

  // 全デッキ合計 (100戦): OTKネメシスは 1/100 = 1.0% (< 2%) なので「その他」に統合
  const allDist = calculateOpponentDistribution(records);
  assert.equal(allDist.totalMatches, 100);
  assert.equal(allDist.otherBreakdown.length, 1);
  assert.equal(allDist.otherBreakdown[0].deck, "OTKネメシス");

  // デッキBのみ選択 (10戦): OTKネメシスは 1/10 = 10.0% (>= 2%) なので個別表示、「その他」なし
  const deckBDist = calculateOpponentDistribution(records, { selectedDeck: "デッキB" });
  assert.equal(deckBDist.totalMatches, 10);
  assert.equal(deckBDist.otherBreakdown.length, 0);
  assert(deckBDist.items.some((x) => x.deck === "OTKネメシス"));

  // 環境・期間フィルターとの組み合わせ確認
  const envFiltered = filterByEnvironment(records, {
    startDate: "2026-10-24",
    endDate: "2026-10-31",
  });
  const periodFiltered = filterPeriod(envFiltered, "all", "", "");
  const envDist = calculateOpponentDistribution(periodFiltered);
  assert.equal(envDist.totalMatches, 10);
  assert.equal(envDist.otherBreakdown.length, 0);
}

// 6. データが少ない場合（1件のみ）およびデータが0件の場合
{
  // 1件のみ（単一セグメント 360度）
  const single = calculateOpponentDistribution(makeMatches(1, "デッキA", "テンポエルフ"));
  assert.equal(single.totalMatches, 1);
  assert.equal(single.segments.length, 1);
  assert.equal(single.segments[0].startAngle, 0);
  assert.equal(single.segments[0].endAngle, 360);
  assert.equal(single.segments[0].gapDegrees, 0);
  const fullPath = describeDonutSegmentPath(70, 70, 46, 62, 0, 360);
  assert(fullPath.includes("A 62 62") && fullPath.includes("A 46 46"), "360度リングのSVGパスが生成されること");

  // 0件の場合
  const empty = calculateOpponentDistribution([]);
  assert.equal(empty.totalMatches, 0);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.segments.length, 0);
  assert.equal(empty.otherBreakdown.length, 0);
}

// 7. 相性表との双方向集計一致（72 + 29 = 101戦）およびミラーマッチの円グラフ記録・ランキング除外
{
  // テンポエルフの順方向72試合（うちミラーマッチ5試合を含む） + 逆方向29試合 = 合計101試合
  const records = [
    ...makeMatches(40, "テンポエルフ", "海賊ロイヤル"),
    ...makeMatches(27, "テンポエルフ", "ランプドラゴン"),
    ...makeMatches(5, "テンポエルフ", "テンポエルフ"), // ミラーマッチ 5試合
    ...makeMatches(19, "海賊ロイヤル", "テンポエルフ"), // 逆方向 19試合
    ...makeMatches(10, "スペルウィッチ", "テンポエルフ"), // 逆方向 10試合
  ];

  const dist = calculateOpponentDistribution(records, { selectedDeck: "テンポエルフ" });
  const totalStats = calculateDeckTotalStats(records, "テンポエルフ");

  // 円グラフの総対戦数と相性表の行ヘッダー総対戦数が一致すること（101戦）
  assert.equal(dist.totalMatches, 101);
  assert.equal(totalStats.total, 101);

  // 円グラフの内訳に逆方向加算分とミラーマッチが含まれること
  // 海賊ロイヤル: 40 + 19 = 59戦, ランプドラゴン: 27戦, スペルウィッチ: 10戦, テンポエルフ(ミラー): 5戦
  const royalItem = dist.items.find((x) => x.deck === "海賊ロイヤル");
  const dragonItem = dist.items.find((x) => x.deck === "ランプドラゴン");
  const witchItem = dist.items.find((x) => x.deck === "スペルウィッチ");
  const mirrorItem = dist.items.find((x) => x.deck === "テンポエルフ");

  assert.equal(royalItem?.count, 59);
  assert.equal(dragonItem?.count, 27);
  assert.equal(witchItem?.count, 10);
  assert.equal(mirrorItem?.count, 5, "円グラフにはミラーマッチも記録・表示されること");

  // 得意・苦手・参考記録ランキングには同デッキ（ミラーマッチ）が含まれないこと
  const rankings = calculateMatchupRankings({
    records,
    selectedDeck: "テンポエルフ",
  });
  const allRankedOpponents = [
    ...rankings.favored.map((x) => x.opponentDeck),
    ...rankings.unfavorable.map((x) => x.opponentDeck),
    ...rankings.referenceRecords.map((x) => x.opponentDeck),
  ];
  assert(
    !allRankedOpponents.includes("テンポエルフ"),
    "得意・苦手・参考記録には同デッキ（ミラーマッチ）を表示しないこと"
  );
  // 逆方向のみの対戦相手（スペルウィッチ 10戦）もランキング集計対象に含まれること
  assert(
    allRankedOpponents.includes("スペルウィッチ"),
    "逆方向のみの対戦相手も得意・苦手・参考記録の集計対象に含まれること"
  );
}

console.log("すべてのドーナツグラフ・対戦相手分布テストに合格しました！");

