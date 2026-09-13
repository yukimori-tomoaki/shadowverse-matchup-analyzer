"use client";

import { Database, Download, RotateCcw, Trash2 } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { CsvUploader } from "@/components/CsvUploader";
import { DeckStats } from "@/components/DeckStats";
import { FilterPanel } from "@/components/FilterPanel";
import { MatchHistoryTable } from "@/components/MatchHistoryTable";
import { MatchupDetail } from "@/components/MatchupDetail";
import { MatchupTable } from "@/components/MatchupTable";
import { SummaryCards } from "@/components/SummaryCards";
import { appendPublicBoard, loadPublicBoard } from "@/lib/publicBoard";
import { filterMatches, getDecks } from "@/lib/matchupCalculator";
import { clearMatches, findDuplicates, loadMatches, saveMatches } from "@/lib/storage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { MatchFilters, MatchRecord, MatchupStats } from "@/types/match";

const initialFilters: MatchFilters = { period: "all", startDate: "", endDate: "", myDeck: "", turn: "all" };

export default function Home() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [filters, setFilters] = useState<MatchFilters>(initialFilters);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<MatchupStats | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const stored = loadMatches();
    if (stored.length > 0) startTransition(() => setRecords(stored));
    if (!isSupabaseConfigured) return;
    if (!supabase) return;
    const client = supabase;
    let active = true;
    startTransition(() => setSyncing(true));
    void loadPublicBoard().then((next) => { if (active) setRecords(next); }).catch(() => { if (active) setMessage("共有データを読み込めませんでした。Supabaseの設定を確認してください。"); }).finally(() => { if (active) setSyncing(false); });
    const channel = client.channel("public-board").on("postgres_changes", { event: "*", schema: "public", table: "public_board_matches" }, () => { void loadPublicBoard().then(setRecords); }).subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, []);

  const filteredRecords = useMemo(() => filterMatches(records, filters.period, filters.startDate, filters.endDate, filters.myDeck, filters.turn), [records, filters]);
  const decks = getDecks(filteredRecords);
  const wins = filteredRecords.filter((record) => record.result === "WIN").length;

  const addRecords = async (incoming: MatchRecord[]) => {
    const duplicates = findDuplicates(records, incoming);
    try {
      setSyncing(true);
      const next = [...records, ...incoming];
      if (isSupabaseConfigured) {
        await appendPublicBoard(incoming);
        setRecords(next);
      } else {
        setRecords(next);
        saveMatches(next);
      }
      setMessage(duplicates ? `${incoming.length}件を追加しました。完全一致する重複候補が${duplicates}件あります。` : `${incoming.length}件を追加しました。`);
    } catch { setMessage("データを共有サーバーへ保存できませんでした。"); } finally { setSyncing(false); }
  };

  const reset = async () => {
    if (!window.confirm("すべての対戦データを削除しますか？\n\nこの操作は元に戻せません。")) return;
    try {
      setSyncing(true);
      clearMatches();
      setRecords([]); setDetail(null); setMessage("データを削除しました。");
    } catch { setMessage("データを削除できませんでした。権限を確認してください。"); } finally { setSyncing(false); }
  };

  return <main className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"><Database size={20} /></div><div><p className="brand-kicker">SHADOWVERSE / MATCH ANALYTICS</p><h1>Matchup Analyzer</h1></div></div><div className="top-actions"><span className="local-badge"><span />ログイン不要・共有ボード</span>{records.length > 0 && <button className="button button-ghost" onClick={() => void reset()}><Trash2 size={15} /> すべて削除</button>}</div></header><div className="content"><section className="hero"><div><p className="eyebrow">REALTIME MATCH DATA COMMAND CENTER</p><h2>対戦結果を、<em>勝ち筋</em>に変える。</h2><p className="hero-copy">CSVを読み込むと共有DBへ追加され、閲覧者の相性表にもリアルタイムで反映されます。</p></div><div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><span>01</span></div></section><CsvUploader hasRecords={records.length > 0} onRecords={(next) => void addRecords(next)} onError={setMessage} />{message && <div className={`notice ${message.includes("エラー") || message.includes("読み込めません") || message.includes("保存できません") ? "error" : ""}`}><span>{message}</span><button onClick={() => setMessage("")}>×</button></div>}{isSupabaseConfigured && <div className="sync-status"><span className="sync-dot" />共有ボードとリアルタイム同期中{syncing && " ..."}</div>}{records.length === 0 ? <section className="empty-state"><RotateCcw size={28} /><h2>共有対戦データを待っています</h2><p>CSVを読み込むと、共有DBへ追加されます。閲覧者は固定URLから最新の相性表を見られます。</p><code>公開閲覧URL: /share</code></section> : <><SummaryCards total={filteredRecords.length} wins={wins} losses={filteredRecords.length - wins} decks={decks.length} /><FilterPanel filters={filters} decks={getDecks(records)} onChange={(next) => setFilters((current) => ({ ...current, ...next }))} /><MatchupTable records={filteredRecords} decks={decks} onSelect={setDetail} /><DeckStats records={filteredRecords} /><MatchHistoryTable records={filteredRecords} /></>}</div>{detail && <><button className="drawer-backdrop" onClick={() => setDetail(null)} aria-label="詳細を閉じる" /><MatchupDetail stats={detail} onClose={() => setDetail(null)} /></>}<footer><span>Shadowverse Matchup Analyzer</span><span>ログイン不要・共有DBと同期</span><button onClick={() => window.print()}><Download size={14} /> 印刷 / PDF</button></footer></main>;
}
