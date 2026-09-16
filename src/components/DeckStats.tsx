import { Award, TrendingDown, TrendingUp } from "lucide-react";
import { calculateDeckTotalStats, calculateMatchup, getDecks } from "@/lib/matchupCalculator";
import type { MatchRecord } from "@/types/match";

export function DeckStats({ records }: { records: MatchRecord[] }) {
  const allDecks = getDecks(records);
  const activeDecks = allDecks.filter((deck) =>
    records.some((r) => r.myDeck === deck || r.opponentDeck === deck)
  );

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><Award size={14} /> DECK PERFORMANCE</span>
          <h2>デッキ別パフォーマンス</h2>
        </div>
      </div>
      <div className="deck-stats-grid">
        {activeDecks.map((deck) => {
          const stats = calculateDeckTotalStats(records, deck);
          if (stats.total === 0) return null;

          const opponents = allDecks
            .filter((opponent) => opponent !== deck)
            .map((opponent) => calculateMatchup(records, deck, opponent))
            .filter((stat) => stat.total > 0);

          const best = [...opponents].sort((a, b) => b.winRate - a.winRate)[0];
          const worst = [...opponents].sort((a, b) => a.winRate - b.winRate)[0];

          const firstRate = stats.firstTotal > 0 ? ((stats.firstWins / stats.firstTotal) * 100).toFixed(1) : "0.0";
          const secondRate = stats.secondTotal > 0 ? ((stats.secondWins / stats.secondTotal) * 100).toFixed(1) : "0.0";

          return (
            <article className="deck-stat" key={deck}>
              <div className="deck-stat-name">
                <span>{deck}</span>
                <b>{stats.total}戦</b>
              </div>
              <div className="deck-stat-rate">{stats.winRate.toFixed(1)}%</div>
              <div className="deck-stat-meta">
                <span>
                  <TrendingUp size={13} /> 先攻 {firstRate}%
                </span>
                <span>
                  <TrendingDown size={13} /> 後攻 {secondRate}%
                </span>
              </div>
              <div className="deck-stat-matchups">
                <span>得意 <strong>{best?.opponentDeck ?? "—"}</strong></span>
                <span>苦手 <strong>{worst?.opponentDeck ?? "—"}</strong></span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
