"use client";

import { Database, Eye, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DeckStats } from "@/components/DeckStats";
import { FilterPanel } from "@/components/FilterPanel";
import { MatchupDetail } from "@/components/MatchupDetail";
import { MatchupTable } from "@/components/MatchupTable";
import { DEFAULT_SHARE_PERIOD } from "@/constants/decks";
import { filterPeriod, getDecks } from "@/lib/matchupCalculator";
import { loadPublicBoard } from "@/lib/publicBoard";
import { supabase } from "@/lib/supabase";
import type { MatchFilters, MatchRecord, MatchupStats } from "@/types/match";

const initialShareFilters: MatchFilters = {
  period: DEFAULT_SHARE_PERIOD,
  startDate: "",
  endDate: "",
  myDeck: "",
  turn: "all",
};

export default function PublicBoardPage() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [filters, setFilters] = useState<MatchFilters>(initialShareFilters);
  const [detail, setDetail] = useState<MatchupStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const refresh = () => {
      void loadPublicBoard()
        .then((next) => {
          if (active) setRecords(next);
        })
        .catch(() => {
          if (active) setError("共有相性表を読み込めませんでした。");
        });
    };
    refresh();
    const channel = client
      .channel("public-board-view")
      .on("postgres_changes", { event: "*", schema: "public", table: "public_board_matches" }, refresh)
      .subscribe();
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, []);

  // 1. 期間フィルター & 同デッキ対戦（ミラーマッチ）の常時除外
  const displayRecords = useMemo(() => {
    const inPeriod = filterPeriod(records, filters.period, filters.startDate, filters.endDate);
    return inPeriod.filter((r) => r.myDeck !== r.opponentDeck);
  }, [records, filters.period, filters.startDate, filters.endDate]);

  // 期間内・ミラー除外後の全デッキ一覧（相手列デッキに使用）
  const periodDecks = useMemo(() => getDecks(displayRecords), [displayRecords]);

  // 表示対象の行デッキ（使用デッキフィルター適用）
  const rowDecks = useMemo(() => {
    if (!filters.myDeck) {
      return periodDecks;
    }
    return periodDecks.filter((deck) => deck === filters.myDeck);
  }, [periodDecks, filters.myDeck]);

  const columnDecks = periodDecks;

  if (error) {
    return (
      <main className="public-shell">
        <div className="public-error">
          <ShieldAlert size={32} />
          <h1>公開ページを表示できません</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="public-shell">
      <header className="public-header">
        <div className="brand">
          <div className="brand-mark">
            <Database size={20} />
          </div>
          <div>
            <p className="brand-kicker">SHADOWVERSE / PUBLIC BOARD</p>
            <h1>Matchup Analyzer</h1>
          </div>
        </div>
        <span className="public-badge">
          <Eye size={14} />常時公開・閲覧専用
        </span>
      </header>

      <div className="public-content">
        <div className="public-title">
          <div>
            <p className="eyebrow">REALTIME SHARED MATCHUP MATRIX</p>
            <h2>デッキ別相性表</h2>
            <p>共有DBに登録された対戦結果をリアルタイムで表示しています。</p>
          </div>
          <div className="total-matches">
            <strong>
              {displayRecords.length.toLocaleString()}
              <br />
              <small>MATCHES</small>
            </strong>
          </div>
        </div>

        {records.length > 0 ? (
          <>
            <FilterPanel
              filters={filters}
              decks={periodDecks}
              deckLabel="使用デッキ"
              showClass={false}
              showDeck={true}
              showTurn={false}
              showExcludeMirror={false}
              onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
            />

            {rowDecks.length > 0 && columnDecks.length > 0 ? (
              <>
                <MatchupTable
                  records={displayRecords}
                  rowDecks={rowDecks}
                  columnDecks={columnDecks}
                  onSelect={setDetail}
                />
                <DeckStats records={displayRecords} decks={rowDecks} />
              </>
            ) : (
              <div className="panel" style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  指定された条件に一致する対戦データがありません。表示条件を変更してください。
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="public-loading">共有データを読み込んでいます...</div>
        )}
      </div>

      {detail && (
        <>
          <button className="drawer-backdrop" onClick={() => setDetail(null)} aria-label="詳細を閉じる" />
          <MatchupDetail stats={detail} onClose={() => setDetail(null)} />
        </>
      )}
    </main>
  );
}
