"use client";

import React, { useState } from "react";
import { ArrowDownUp, ChevronRight } from "lucide-react";
import type { MatchRecord, MatchupStats } from "@/types/match";
import { calculateMatchup, matchupTone } from "@/lib/matchupCalculator";
import { ClassIcon } from "@/components/ClassIcon";
import type { ClassKey } from "@/types/classIcon";

export type MatchupListProps = {
  records: MatchRecord[];
  activeDeck: string;
  opponentDecks: string[];
  classIcons?: Record<ClassKey, string>;
  onSelect: (stats: MatchupStats) => void;
  turnFilter?: string;
};

export function MatchupList({
  records,
  activeDeck,
  opponentDecks,
  classIcons,
  onSelect,
  turnFilter = "all",
}: MatchupListProps) {
  const [sortBy, setSortBy] = useState<"matches" | "winRate">("matches");

  const items = opponentDecks
    .filter((opp) => opp !== activeDeck)
    .map((opp) => {
      const stats = calculateMatchup(records, activeDeck, opp, turnFilter);
      const tone = matchupTone(stats.winRate, stats.total);
      const confidence =
        stats.total >= 20 ? "高" : stats.total >= 8 ? "中" : "低";
      return {
        opponentDeck: opp,
        stats,
        tone,
        confidence,
      };
    })
    .filter((item) => item.stats.total > 0);

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "matches") {
      return b.stats.total - a.stats.total;
    }
    return b.stats.winRate - a.stats.winRate;
  });

  return (
    <div className="matchup-list-container">
      <div className="matchup-list-header">
        <div className="list-heading-left">
          <span className="list-title">対戦相性</span>
          <span className="list-count-badge">
            {sortBy === "matches" ? "(対戦数順)" : "(勝率順)"}
          </span>
        </div>
        <button
          type="button"
          className="sort-toggle-btn"
          onClick={() => setSortBy(sortBy === "matches" ? "winRate" : "matches")}
        >
          <ArrowDownUp size={13} />
          <span>{sortBy === "matches" ? "対戦数順" : "勝率順"}</span>
        </button>
      </div>

      {sortedItems.length === 0 ? (
        <div className="empty-list-card">
          <p>このデッキでの対戦データがありません。</p>
        </div>
      ) : (
        <div className="matchup-cards-stack">
          {sortedItems.map(({ opponentDeck, stats, tone, confidence }) => {
            const winWidthPercent = stats.total > 0 ? Math.min(100, Math.max(0, stats.winRate)) : 0;

            return (
              <div
                key={opponentDeck}
                className={`matchup-card-item tone-${tone.tone}`}
                onClick={() => onSelect(stats)}
                role="button"
                tabIndex={0}
              >
                <div className="matchup-card-left">
                  <div className="class-badge-hex">
                    <ClassIcon
                      deckName={opponentDeck}
                      size={28}
                      customUrl={classIcons ? Object.values(classIcons)[0] : undefined}
                      showBadge
                    />
                  </div>
                </div>

                <div className="matchup-card-body">
                  <div className="card-title-row">
                    <strong className="opponent-deck-title">{opponentDeck}</strong>
                    <span className="opponent-tag">対戦相手</span>
                  </div>

                  <div className="card-rate-row">
                    <span className="rate-num">{stats.winRate.toFixed(1)}%</span>
                    <span className="record-num">
                      {stats.wins}勝 / {stats.losses}敗
                      <span className="record-divider">|</span>
                      {stats.total}戦
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="winrate-bar-track">
                    <div
                      className={`winrate-bar-fill ${tone.tone}`}
                      style={{ width: `${winWidthPercent}%` }}
                    />
                  </div>

                  <div className="card-footer-row">
                    <span className="confidence-text">
                      信頼度: {confidence} (対戦数 {stats.total})
                    </span>
                  </div>
                </div>

                <div className="matchup-card-right">
                  <span className={`tone-badge ${tone.tone}`}>{tone.label}</span>
                  <ChevronRight size={18} className="card-chevron" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
