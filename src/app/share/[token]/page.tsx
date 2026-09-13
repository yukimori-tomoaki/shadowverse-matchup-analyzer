"use client";

import { Database, Eye, ShieldAlert } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { MatchupTable } from "@/components/MatchupTable";
import { MatchupDetail } from "@/components/MatchupDetail";
import { loadGuestMatches, loadPublicMatches } from "@/lib/publicShare";
import { getDecks } from "@/lib/matchupCalculator";
import { supabase } from "@/lib/supabase";
import type { MatchRecord, MatchupStats } from "@/types/match";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [detail, setDetail] = useState<MatchupStats | null>(null);
  const [error, setError] = useState("");
  const [guest, setGuest] = useState(false);

  useEffect(() => { void params.then(({ token: nextToken }) => setToken(nextToken)); startTransition(() => setGuest(new URLSearchParams(window.location.search).get("guest") === "1")); }, [params]);
  useEffect(() => {
    if (!token || !supabase) return;
    let active = true;
    const refresh = () => { void (guest ? loadGuestMatches(token) : loadPublicMatches(token)).then((next) => { if (active) setRecords(next); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "公開データを読み込めませんでした。"); }); };
    refresh();
    const channel = guest ? null : supabase.channel(`public-share-${token}`).on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refresh).subscribe();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, [guest, token]);

  const decks = useMemo(() => getDecks(records), [records]);
  if (error) return <main className="public-shell"><div className="public-error"><ShieldAlert size={32} /><h1>公開ページを表示できません</h1><p>{error}</p></div></main>;
  return <main className="public-shell"><header className="public-header"><div className="brand"><div className="brand-mark"><Database size={20} /></div><div><p className="brand-kicker">SHADOWVERSE / PUBLIC VIEW</p><h1>Matchup Analyzer</h1></div></div><span className="public-badge"><Eye size={14} />閲覧専用</span></header><div className="public-content"><div className="public-title"><div><p className="eyebrow">SHARED MATCHUP MATRIX</p><h2>デッキ別相性表</h2><p>共有された対戦データの閲覧ページです。データはリアルタイムに更新されます。</p></div><strong>{records.length.toLocaleString()} <small>MATCHES</small></strong></div>{records.length > 0 ? <MatchupTable records={records} decks={decks} onSelect={setDetail} /> : <div className="public-loading">公開データを読み込んでいます...</div>}</div>{detail && <><button className="drawer-backdrop" onClick={() => setDetail(null)} aria-label="詳細を閉じる" /><MatchupDetail stats={detail} onClose={() => setDetail(null)} /></>}</main>;
}
