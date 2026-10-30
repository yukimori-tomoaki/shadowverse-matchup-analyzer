"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Info,
  PieChart as PieIcon,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type { MatchRecord, MatchupStats } from "@/types/match";
import type { ClassKey } from "@/types/classIcon";
import {
  calculateMatchupRankings,
  calculateOpponentDistribution,
  describeDonutSegmentPath,
  getMyDecks,
  MIN_MATCHES_FOR_RANKING,
  OTHER_THRESHOLD_PERCENT,
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
  turnFilter?: string;
  classIcons?: Record<ClassKey, string>;
  onSelectStats: (stats: MatchupStats) => void;
};

const DONUT_CENTER = 70;
const DONUT_INNER_RADIUS = 46;
const DONUT_OUTER_RADIUS = 62;

export function MatchupAnalyticsView({
  records,
  allDecks,
  selectedDeck,
  onSelectDeck,
  period,
  onSelectPeriod,
  turnFilter = "all",
  classIcons,
  onSelectStats,
}: MatchupAnalyticsViewProps) {
  const [showOtherDetail, setShowOtherDetail] = useState(false);

  const myDecks = useMemo(() => getMyDecks(records), [records]);
  const activeDeckList = myDecks.length > 0 ? myDecks : allDecks;

  // 対戦相手のデッキ分布（12時方向開始・時計回り・2%未満「その他」統合）
  const distribution = useMemo(() => {
    return calculateOpponentDistribution(records, {
      selectedDeck,
    });
  }, [records, selectedDeck]);

  const { totalMatches, items: legendItems, segments: donutSegments, otherBreakdown } = distribution;
  const otherItem = useMemo(() => legendItems.find((item) => item.isOther) ?? null, [legendItems]);
  const isOtherOpen = showOtherDetail && otherBreakdown.length > 0;

  // 得意対面・苦手対面・参考記録のランキング計算（Wilson score lower bound 方式）
  const { favored: favoredMatchups, unfavorable: unfavorableMatchups, referenceRecords } = useMemo(() => {
    return calculateMatchupRankings({
      records,
      selectedDeck,
      turnFilter,
    });
  }, [records, selectedDeck, turnFilter]);

  return (
    <div className="matchup-analytics-view">
      {/* デッキ相性データ パネル */}
      <div className="matchup-data-card">
        {/* 1. デッキ相性データの見出し */}
        <div className="card-header-row">
          <div className="header-title-left">
            <span className="icon-wrap-purple">
              <PieIcon size={18} />
            </span>
            <h2 className="card-heading-text">デッキ相性データ</h2>
          </div>
        </div>

        {/* 2. 使用デッキフィルター（全デッキ合計 or 個別デッキ） */}
        <div className="deck-selector-row">
          <span className="selector-label">使用デッキ</span>
          <div className="selector-input-wrap">
            <select
              className="deck-select-dropdown"
              value={selectedDeck}
              onChange={(e) => {
                setShowOtherDetail(false);
                onSelectDeck(e.target.value);
              }}
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

        {/* 3. 対象期間フィルター */}
        <div className="period-pill-group">
          <span className="period-label">対象期間</span>
          <div className="pills-track">
            <button
              type="button"
              className={`pill-btn ${period === "today" ? "active" : ""}`}
              onClick={() => {
                setShowOtherDetail(false);
                onSelectPeriod("today");
              }}
            >
              今日
            </button>
            <button
              type="button"
              className={`pill-btn ${period === "7days" ? "active" : ""}`}
              onClick={() => {
                setShowOtherDetail(false);
                onSelectPeriod("7days");
              }}
            >
              過去7日
            </button>
            <button
              type="button"
              className={`pill-btn ${period === "all" ? "active" : ""}`}
              onClick={() => {
                setShowOtherDetail(false);
                onSelectPeriod("all");
              }}
            >
              全期間
            </button>
          </div>
        </div>

        {/* 4. 対戦相手のデッキ分布（ドーナツグラフ・凡例・その他の内訳確認） */}
        <div className="donut-chart-section">
          <h4 className="chart-title">対戦相手のデッキ分布</h4>

          {totalMatches === 0 ? (
            <div className="donut-empty-state" role="status">
              <PieIcon size={28} className="donut-empty-icon" />
              <p className="donut-empty-title">条件に一致する対戦データがありません</p>
              <p className="donut-empty-sub">
                使用デッキや対象期間を変更してご確認ください。
              </p>
            </div>
          ) : (
            <>
              {/* ドーナツグラフ（12時方向開始・時計回り・隙間付き） */}
              <div className="donut-center-container">
                <svg
                  viewBox="0 0 140 140"
                  className="donut-svg"
                  role="img"
                  aria-label={`対戦相手のデッキ分布（総対戦数 ${totalMatches}戦）`}
                >
                  {/* テーマに合わせたベースリング */}
                  <circle
                    cx={DONUT_CENTER}
                    cy={DONUT_CENTER}
                    r={(DONUT_INNER_RADIUS + DONUT_OUTER_RADIUS) / 2}
                    fill="transparent"
                    stroke="var(--panel)"
                    strokeWidth={DONUT_OUTER_RADIUS - DONUT_INNER_RADIUS + 2}
                  />
                  {/* ドーナツセグメント */}
                  {donutSegments.map((seg) => {
                    const pathData = describeDonutSegmentPath(
                      DONUT_CENTER,
                      DONUT_CENTER,
                      DONUT_INNER_RADIUS,
                      DONUT_OUTER_RADIUS,
                      seg.startAngle,
                      seg.endAngle
                    );
                    const isOther = Boolean(seg.isOther);
                    return (
                      <path
                        key={seg.deck}
                        d={pathData}
                        fill={seg.color}
                        stroke="var(--panel)"
                        strokeWidth={donutSegments.length > 1 ? 1 : 0}
                        strokeLinejoin="round"
                        className={`donut-segment-path ${isOther ? "donut-segment-other" : ""}`}
                        onClick={
                          isOther
                            ? () => setShowOtherDetail((prev) => !prev)
                            : undefined
                        }
                        onKeyDown={
                          isOther
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setShowOtherDetail((prev) => !prev);
                                }
                              }
                            : undefined
                        }
                        role={isOther ? "button" : undefined}
                        tabIndex={isOther ? 0 : undefined}
                        aria-label={
                          isOther
                            ? `その他: ${seg.count}戦 (${seg.percent.toFixed(1)}%) - タップして内訳を表示`
                            : `${seg.deck}: ${seg.count}戦 (${seg.percent.toFixed(1)}%)`
                        }
                      >
                        <title>{`${seg.deck}: ${seg.count}戦 (${seg.percent.toFixed(1)}%)`}</title>
                      </path>
                    );
                  })}
                </svg>

                {/* 中央テキスト */}
                <div className="donut-center-text">
                  <span className="center-count">{totalMatches}</span>
                  <span className="center-sub">TOTAL</span>
                </div>
              </div>

              {/* ドーナツ凡例（スマホ2列グリッド対応） */}
              <div className="donut-legend-wrap">
                {legendItems.map((item) => {
                  if (item.isOther) {
                    return (
                      <button
                        key={item.deck}
                        type="button"
                        className={`donut-legend-tag donut-legend-other-btn ${isOtherOpen ? "active" : ""}`}
                        onClick={() => setShowOtherDetail((prev) => !prev)}
                        aria-expanded={isOtherOpen}
                        title={`「その他」の内訳を確認（${item.count}戦 / ${item.percent.toFixed(1)}%）`}
                      >
                        <span
                          className="legend-color-dot"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="legend-deck-name">{item.deck}</span>
                        <span className="legend-deck-pct">
                          {item.percent.toFixed(1)}%
                        </span>
                        <ChevronRight
                          size={13}
                          className={`legend-other-chevron ${isOtherOpen ? "open" : ""}`}
                        />
                      </button>
                    );
                  }

                  return (
                    <div
                      key={item.deck}
                      className="donut-legend-tag"
                      title={`${item.deck}: ${item.count}戦 (${item.percent.toFixed(1)}%)`}
                    >
                      <span
                        className="legend-color-dot"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="legend-deck-name">{item.deck}</span>
                      <span className="legend-deck-pct">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* その他の内訳確認ポップオーバー */}
              {isOtherOpen && otherItem && (
                <div
                  className="other-breakdown-popover"
                  role="dialog"
                  aria-label="その他のデッキ内訳"
                >
                  <div className="other-popover-header">
                    <div className="other-popover-title-wrap">
                      <span
                        className="legend-color-dot"
                        style={{ backgroundColor: otherItem.color }}
                      />
                      <h5 className="other-popover-title">「その他」の内訳</h5>
                      <span className="other-popover-summary">
                        計{otherItem.count}戦 ({otherItem.percent.toFixed(1)}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="other-popover-close"
                      onClick={() => setShowOtherDetail(false)}
                      aria-label="内訳を閉じる"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <p className="other-popover-note">
                    構成比{OTHER_THRESHOLD_PERCENT}%未満のデッキ（{otherBreakdown.length}種類）を統合しています
                  </p>
                  <div className="other-breakdown-list">
                    {otherBreakdown.map((sub) => (
                      <div key={sub.deck} className="other-breakdown-row">
                        <div className="other-breakdown-deck">
                          <ClassIcon
                            deckName={sub.deck}
                            size={18}
                            showBadge
                            customUrl={
                              classIcons
                                ? classIcons[getDeckClassKey(sub.deck) as ClassKey]
                                : undefined
                            }
                          />
                          <span className="other-breakdown-name" title={sub.deck}>
                            {sub.deck}
                          </span>
                        </div>
                        <div className="other-breakdown-stats">
                          <span className="other-breakdown-count">{sub.count}戦</span>
                          <span className="other-breakdown-pct">
                            {sub.percent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 得意対面・苦手対面・参考記録 */}
        {(favoredMatchups.length > 0 || unfavorableMatchups.length > 0 || referenceRecords.length > 0) && (
          <p className="ranking-method-note">
            ※ 得意・苦手対面は対戦回数{MIN_MATCHES_FOR_RANKING}戦以上を対象に、Wilsonスコア（統計的下限値）を元に対戦回数と勝率のバランスを考慮して順位決定しています。信頼度は対戦回数に基づく目安です。
          </p>
        )}

        {/* 得意対面 */}
        {favoredMatchups.length > 0 && (
          <div className="favored-matchups-section">
            <div className="matchup-sub-header">
              <TrendingUp size={16} color="#10b981" />
              <h4>得意対面（{MIN_MATCHES_FOR_RANKING}戦以上）</h4>
            </div>
            <div className="matchup-quick-list">
              {favoredMatchups.map((m) => (
                <div
                  key={m.opponentDeck}
                  className="quick-matchup-item"
                  onClick={() => onSelectStats(m.stats)}
                >
                  <div className="quick-item-left">
                    <span className="quick-rank-badge rank-high">#{m.rank}</span>
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
                    <div className="quick-deck-info">
                      <span className="quick-deck-name">{m.opponentDeck}</span>
                      <span
                        className={`confidence-badge confidence-${m.confidence.level}`}
                        title={m.confidence.description}
                      >
                        {m.confidence.label}
                      </span>
                    </div>
                  </div>
                  <div className="quick-item-right">
                    <strong className="quick-rate win-rate-high">
                      {m.winRate.toFixed(1)}%
                    </strong>
                    <span className="quick-stats-count">
                      {m.wins}勝{m.losses}敗（計{m.total}戦）
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 苦手対面 */}
        {unfavorableMatchups.length > 0 && (
          <div className="unfavorable-matchups-section">
            <div className="matchup-sub-header">
              <TrendingDown size={16} color="#f43f5e" />
              <h4>苦手対面（{MIN_MATCHES_FOR_RANKING}戦以上）</h4>
            </div>
            <div className="matchup-quick-list">
              {unfavorableMatchups.map((m) => (
                <div
                  key={m.opponentDeck}
                  className="quick-matchup-item"
                  onClick={() => onSelectStats(m.stats)}
                >
                  <div className="quick-item-left">
                    <span className="quick-rank-badge rank-low">#{m.rank}</span>
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
                    <div className="quick-deck-info">
                      <span className="quick-deck-name">{m.opponentDeck}</span>
                      <span
                        className={`confidence-badge confidence-${m.confidence.level}`}
                        title={m.confidence.description}
                      >
                        {m.confidence.label}
                      </span>
                    </div>
                  </div>
                  <div className="quick-item-right">
                    <strong className="quick-rate win-rate-low">
                      {m.winRate.toFixed(1)}%
                    </strong>
                    <span className="quick-stats-count">
                      {m.wins}勝{m.losses}敗（計{m.total}戦）
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 参考記録（10戦未満・五分など） */}
        {referenceRecords.length > 0 && (
          <div className="reference-matchups-section">
            <div className="matchup-sub-header">
              <Info size={16} color="#94a3b8" />
              <h4>
                参考記録
                <span className="reference-header-hint">（{MIN_MATCHES_FOR_RANKING}戦未満）</span>
              </h4>
            </div>
            <div className="matchup-quick-list">
              {referenceRecords.map((m) => (
                <div
                  key={m.opponentDeck}
                  className="quick-matchup-item reference-item"
                  onClick={() => onSelectStats(m.stats)}
                >
                  <div className="quick-item-left">
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
                    <div className="quick-deck-info">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span className="quick-deck-name">{m.opponentDeck}</span>
                        <span
                          className={`confidence-badge confidence-${m.confidence.level}`}
                          title={m.confidence.description}
                        >
                          {m.confidence.label}
                        </span>
                      </div>
                      <span className="reference-reason-badge">
                        対象外理由: {m.reason}
                      </span>
                    </div>
                  </div>
                  <div className="quick-item-right">
                    <strong className="quick-rate win-rate-ref">
                      {m.winRate.toFixed(1)}%
                    </strong>
                    <span className="quick-stats-count">
                      {m.wins}勝{m.losses}敗（計{m.total}戦）
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
