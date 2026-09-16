"use client";

import { Database, Eye, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MatchupDetail } from "@/components/MatchupDetail";
import { MatchupTable } from "@/components/MatchupTable";
import { loadPublicBoard } from "@/lib/publicBoard";
import { getDecks } from "@/lib/matchupCalculator";
import { supabase } from "@/lib/supabase";
import type { MatchRecord, MatchupStats } from "@/types/match";
import { DeckStats } from "@/components/DeckStats";
export default function PublicBoardPage() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [detail, setDetail] = useState<MatchupStats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const refresh = () => { void loadPublicBoard().then((next) => { if (active) setRecords(next); }).catch(() => { if (active) setError("共有相性表を読み込めませんでした。"); }); };
    refresh();
    const channel = client.channel("public-board-view").on("postgres_changes", { event: "*", schema: "public", table: "public_board_matches" }, refresh).subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, []);
  const allDecks = useMemo(() => getDecks(records), [records]);
  if (error) return <main className="public-shell"><div className="public-error"><ShieldAlert size={32} /><h1>公開ページを表示できません</h1><p>{error}</p></div></main>;
  return <main className="public-shell"><header className="public-header"><div className="brand"><div className="brand-mark"><Database size={20} /></div><div><p className="brand-kicker">SHADOWVERSE / PUBLIC BOARD</p><h1>Matchup Analyzer</h1></div></div><span className="public-badge"><Eye size={14} />常時公開・閲覧専用</span></header><div className="public-content"><div className="public-title"><div><p className="eyebrow">REALTIME SHARED MATCHUP MATRIX</p><h2>デッキ別相性表</h2><p>共有DBに登録された対戦結果をリアルタイムで表示しています。</p></div><div className="total-matches"><strong>{records.length.toLocaleString()}<br/><small>MATCHES</small></strong></div></div>{records.length > 0 ? (
        <>
          <MatchupTable records={records} rowDecks={allDecks} columnDecks={allDecks} onSelect={setDetail} />
          <DeckStats records={records} />
        </>
      ) : (
        <div className="public-loading">共有データを読み込んでいます...</div>
      )}</div>{detail && <><button className="drawer-backdrop" onClick={() => setDetail(null)} aria-label="詳細を閉じる" /><MatchupDetail stats={detail} onClose={() => setDetail(null)} /></>}</main>;
}
