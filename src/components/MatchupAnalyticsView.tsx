"use client";

import React, { useMemo } from "react";
import {
  ChevronDown,
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { MatchRecord, MatchupStats } from "@/types/match";
import type { ClassKey } from "@/types/classIcon";
import {
  calculateMatchup,
  getDecks,
  getMyDecks,
} from "@/lib/matchupCalculator";
import { getDeckClassKey } from "@/constants/classIcons";
import { ClassIcon } from "@/components/ClassIcon";

export type MatchupAnalyticsViewProps = {
  records: MatchRecord[];
  allDecks: string[];
  selectedDeck: string;
  onSelectDeck: (deck: string) => void;
  period: string;
  onSelectPeriod: (period: "all" | "today" | "7days" | "30days") => void;
  classIcons?: Record<ClassKey, string>;
  onSelectStats: (stats: MatchupStats) => void;
};

// クラスカラー
const CLASS_COLORS: Record<string, string> = {
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

function getDeckColor(name: string): string {
  for (const [cls, color] of Object.entries(CLASS_COLORS)) {
    if (name.includes(cls)) return color;
  }
  return "#38bdf8";
}

export function MatchupAnalyticsView({
  records,
  allDecks,
  selectedDeck,
  onSelectDeck,
  period,
  onSelectPeriod,
  classIcons,
  onSelectStats,
}: MatchupAnalyticsViewProps) {
  const myDecks = useMemo(() => getMyDecks(records), [records]);
  const activeDeckList = myDecks.length > 0 ? myDecks : allDecks;

  // 選択デッキに応じたレコード絞り込み
  const currentRecords = useMemo(() => {
    if (!selectedDeck) return records;
    return records.filter((r) => r.myDeck === selectedDeck);
  }, [records, selectedDeck]);

  const total = currentRecords.length;
  const wins = currentRecords.filter((r) => r.result === "WIN").length;
  const losses = total - wins;
  const overallWinRate = total > 0 ? (wins / total) * 100 : 0;

  // 先攻・後攻集計
  const firstMatches = currentRecords.filter((r) => r.turn === "先攻");
  const firstWins = firstMatches.filter((r) => r.result === "WIN").length;
  const firstRate = firstMatches.length > 0 ? (firstWins / firstMatches.length) * 100 : 0;

  const secondMatches = currentRecords.filter((r) => r.turn === "後攻");
  const secondWins = secondMatches.filter((r) => r.result === "WIN").length;
  const secondRate = secondMatches.length > 0 ? (secondWins / secondMatches.length) * 100 : 0;

  // 対戦相手のデッキ分布（ドーナツチャート用）
  const opponentDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of currentRecords) {
      if (!r.opponentDeck) continue;
      map.set(r.opponentDeck, (map.get(r.opponentDeck) ?? 0) + 1);
    }
    const list = Array.from(map.entries())
      .map(([deck, count]) => ({
        deck,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
        color: getDeckColor(deck),
      }))
      .sort((a, b) => b.count - a.count);
    return list;
  }, [currentRecords, total]);

  // 得意対面・苦手対面（3戦以上の対面から算出）
  const { favoredMatchups, unfavorableMatchups } = useMemo(() => {
    const oppDecks = getDecks(currentRecords);
    const matchupList: {
      opponentDeck: string;
      stats: MatchupStats;
      winRate: number;
    }[] = [];

    for (const opp of oppDecks) {
      if (selectedDeck && opp === selectedDeck) continue;
      const stats = calculateMatchup(records, selectedDeck || (myDecks[0] ?? oppDecks[0]), opp);
      if (stats.total > 0) {
        matchupList.push({
          opponentDeck: opp,
          stats,
          winRate: stats.winRate,
        });
      }
    }

    // 勝利降順（得意）
    const favored = [...matchupList]
      .filter((m) => m.winRate >= 50)
      .sort((a, b) => b.winRate - a.winRate || b.stats.total - a.stats.total)
      .slice(0, 3);

    // 勝利昇順（苦手）
    const unfavorable = [...matchupList]
      .filter((m) => m.winRate < 50)
      .sort((a, b) => a.winRate - b.winRate || b.stats.total - a.stats.total)
      .slice(0, 3);

    return { favoredMatchups: favored, unfavorableMatchups: unfavorable };
  }, [currentRecords, records, selectedDeck, myDecks]);

  // SVG ドーナツチャートのセグメント計算
  const donutSegments = useMemo(() => {
    if (total === 0) return [];
    let cumulative = 0;
    const circumference = 2 * Math.PI * 54; // 半径54

    return opponentDistribution.map((item) => {
      const strokeLength = (item.count / total) * circumference;
      const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
      const strokeDashoffset = -cumulative;
      cumulative += strokeLength;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [opponentDistribution, total]);

  return (
    <div className="matchup-analytics-view">
      {/* デッキ相性データ パネル（添付画像2スタイル） */}
      <div className="matchup-data-card">
        {/* ヘッダー */}
        <div className="card-header-row">
          <div className="header-title-left">
            <span className="icon-wrap-purple">
              <PieIcon size={18} />
            </span>
            <h2 className="card-heading-text">デッキ相性データ</h2>
          </div>
        </div>

        {/* 使用デッキ選択（全デッキ合計 or 個別デッキ） */}
        <div className="deck-selector-row">
          <span className="selector-label">使用デッキ</span>
          <div className="selector-input-wrap">
            <select
              className="deck-select-dropdown"
              value={selectedDeck}
              onChange={(e) => onSelectDeck(e.target.value)}
            >
              <option value="">全デッキ合計</option>
              {activeDeckList.map((deck) => (
                <option key={deck} value={deck}>
                  {deck}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="dropdown-arrow-icon" />
          </div>
        </div>

        {/* 対象期間ピルボタングループ */}
        <div className="period-pill-group">
          <span className="period-label">対象期間</span>
          <div className="pills-track">
            <button
              type="button"
              className={`pill-btn ${period === "today" ? "active" : ""}`}
              onClick={() => onSelectPeriod("today")}
            >
              今日
            </button>
            <button
              type="button"
              className={`pill-btn ${period === "7days" ? "active" : ""}`}
              onClick={() => onSelectPeriod("7days")}
            >
              過去7日
            </button>
            <button
              type="button"
              className={`pill-btn ${period === "all" ? "active" : ""}`}
              onClick={() => onSelectPeriod("all")}
            >
              全期間
            </button>
          </div>
        </div>

        {/* 期間の戦績 */}
        <div className="period-record-banner">
          <span className="banner-label">期間の戦績</span>
          <div className="banner-nums">
            <strong className="num-total">{total}</strong>
            <small>戦</small>
            <span className="banner-sep">|</span>
            <strong className="num-win">{wins}</strong>
            <small>勝</small>
            <strong className="num-loss">{losses}</strong>
            <small>敗</small>
          </div>
        </div>

        {/* 3連勝率カード */}
        <div className="winrate-triad-cards">
          <div className="winrate-card">
            <span className="winrate-title">勝率</span>
            <div className="winrate-value winrate-cyan">
              <strong>{overallWinRate.toFixed(0)}</strong>
              <span>%</span>
            </div>
          </div>

          <div className="winrate-card">
            <span className="winrate-title">先攻勝率</span>
            <div className="winrate-value winrate-teal">
              <strong>{firstRate.toFixed(0)}</strong>
              <span>%</span>
            </div>
            <span className="winrate-count">{firstMatches.length}戦</span>
          </div>

          <div className="winrate-card">
            <span className="winrate-title">後攻勝率</span>
            <div className="winrate-value winrate-pink">
              <strong>{secondRate.toFixed(0)}</strong>
              <span>%</span>
            </div>
            <span className="winrate-count">{secondMatches.length}戦</span>
          </div>
        </div>

        {/* 対戦相手のデッキ分布（ドーナツチャート） */}
        {total > 0 && (
          <div className="donut-chart-section">
            <h4 className="chart-title">対戦相手のデッキ分布</h4>

            <div className="donut-center-container">
              <svg viewBox="0 0 140 140" className="donut-svg">
                {/* 背景サークル */}
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="16"
                />
                {/* ドーナツセグメント */}
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.deck}
                    cx="70"
                    cy="70"
                    r="54"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    transform="rotate(-90 70 70)"
                    style={{ transition: "stroke-dasharray 0.4s ease" }}
                  />
                ))}
              </svg>
              {/* 中央テキスト */}
              <div className="donut-center-text">
                <span className="center-count">{total}</span>
                <span className="center-sub">TOTAL</span>
              </div>
            </div>

            {/* ドーナツ凡例 */}
            <div className="donut-legend-wrap">
              {opponentDistribution.slice(0, 6).map((item) => (
                <div key={item.deck} className="donut-legend-tag">
                  <span
                    className="legend-color-dot"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="legend-deck-name">{item.deck}</span>
                  <span className="legend-deck-pct">{item.percent.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 得意対面・苦手対面 */}
        {favoredMatchups.length > 0 && (
          <div className="favored-matchups-section">
            <div className="matchup-sub-header">
              <TrendingUp size={16} color="#10b981" />
              <h4>得意対面</h4>
            </div>
            <div className="matchup-quick-list">
              {favoredMatchups.map((m, idx) => (
                <div
                  key={m.opponentDeck}
                  className="quick-matchup-item"
                  onClick={() => onSelectStats(m.stats)}
                >
                  <div className="quick-item-left">
                    <span className="quick-rank-badge rank-high">#{idx + 1}</span>
                    <ClassIcon
                      deckName={m.opponentDeck}
                      size={22}
                      showBadge
                      customUrl={
                        classIcons
                          ? classIcons[getDeckClassKey(m.opponentDeck) as ClassKey]
                          : undefined
                      }
                    />
                    <span className="quick-deck-name">{m.opponentDeck}</span>
                  </div>
                  <div className="quick-item-right">
                    <strong className="quick-rate win-rate-high">
                      {m.winRate.toFixed(0)}%
                    </strong>
                    <span className="quick-stats-count">
                      {m.stats.wins}勝{m.stats.losses}敗
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unfavorableMatchups.length > 0 && (
          <div className="unfavorable-matchups-section">
            <div className="matchup-sub-header">
              <TrendingDown size={16} color="#f43f5e" />
              <h4>苦手対面</h4>
            </div>
            <div className="matchup-quick-list">
              {unfavorableMatchups.map((m, idx) => (
                <div
                  key={m.opponentDeck}
                  className="quick-matchup-item"
                  onClick={() => onSelectStats(m.stats)}
                >
                  <div className="quick-item-left">
                    <span className="quick-rank-badge rank-low">#{idx + 1}</span>
                    <ClassIcon
                      deckName={m.opponentDeck}
                      size={22}
                      showBadge
                      customUrl={
                        classIcons
                          ? classIcons[getDeckClassKey(m.opponentDeck) as ClassKey]
                          : undefined
                      }
                    />
                    <span className="quick-deck-name">{m.opponentDeck}</span>
                  </div>
                  <div className="quick-item-right">
                    <strong className="quick-rate win-rate-low">
                      {m.winRate.toFixed(0)}%
                    </strong>
                    <span className="quick-stats-count">
                      {m.stats.wins}勝{m.stats.losses}敗
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
