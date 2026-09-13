"use client";

import { Database, Download, RotateCcw, Trash2 } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { CsvUploader } from "@/components/CsvUploader";
import { DeckStats } from "@/components/DeckStats";
import { FilterPanel } from "@/components/FilterPanel";
import { GuestPublishPanel } from "@/components/GuestPublishPanel";
import { MatchHistoryTable } from "@/components/MatchHistoryTable";
import { MatchupDetail } from "@/components/MatchupDetail";
import { MatchupTable } from "@/components/MatchupTable";
import { PublicSharePanel } from "@/components/PublicSharePanel";
import { SummaryCards } from "@/components/SummaryCards";
import { clearCloudMatches, insertCloudMatches, loadCloudMatches } from "@/lib/cloudStorage";
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
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleWorkspace = useCallback((nextWorkspaceId: string | null) => setWorkspaceId(nextWorkspaceId), []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const stored = loadMatches();
      if (stored.length > 0) startTransition(() => setRecords(stored));
      return;
    }
    if (!workspaceId || !supabase) { startTransition(() => setRecords([])); return; }
    const client = supabase;
    let active = true;
    startTransition(() => setSyncing(true));
    void loadCloudMatches(workspaceId).then((next) => { if (active) setRecords(next); }).catch(() => { if (active) setMessage("共有データを読み込めませんでした。Supabaseの設定を確認してください。"); }).finally(() => { if (active) setSyncing(false); });
    const channel = client.channel(`workspace-${workspaceId}`).on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `workspace_id=eq.${workspaceId}` }, () => { void loadCloudMatches(workspaceId).then(setRecords); }).subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, [workspaceId]);

  const filteredRecords = useMemo(() => filterMatches(records, filters.period, filters.startDate, filters.endDate, filters.myDeck, filters.turn), [records, filters]);
  const decks = getDecks(filteredRecords);
  const wins = filteredRecords.filter((record) => record.result === "WIN").length;

  const addRecords = async (incoming: MatchRecord[]) => {
    const duplicates = findDuplicates(records, incoming);
    try {
      setSyncing(true);
      if (workspaceId && isSupabaseConfigured) {
        await insertCloudMatches(workspaceId, incoming);
        setRecords((current) => [...current, ...incoming]);
      } else {
        const next = [...records, ...incoming];
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
      if (workspaceId && isSupabaseConfigured) await clearCloudMatches(workspaceId); else clearMatches();
      setRecords([]); setDetail(null); setMessage("データを削除しました。");
    } catch { setMessage("データを削除できませんでした。権限を確認してください。"); } finally { setSyncing(false); }
  };

  return <main className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"><Database size={20} /></div><div><p className="brand-kicker">SHADOWVERSE / MATCH ANALYTICS</p><h1>Matchup Analyzer</h1></div></div><div className="top-actions"><AuthPanel onWorkspace={handleWorkspace} />{records.length > 0 && <button className="button button-ghost" onClick={() => void reset()}><Trash2 size={15} /> すべて削除</button>}</div></header><div className="content"><section className="hero"><div><p className="eyebrow">REALTIME MATCH DATA COMMAND CENTER</p><h2>対戦結果を、<em>勝ち筋</em>に変える。</h2><p className="hero-copy">CSVを読み込むだけで、デッキごとの相性・信頼度・先攻後攻の傾向を一画面で把握できます。</p></div><div className="hero-orbit"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><span>01</span></div></section><CsvUploader hasRecords={records.length > 0} onRecords={(next) => void addRecords(next)} onError={setMessage} />{message && <div className={`notice ${message.includes("エラー") || message.includes("読み込めません") || message.includes("保存できません") ? "error" : ""}`}><span>{message}</span><button onClick={() => setMessage("")}>×</button></div>}{isSupabaseConfigured && workspaceId && <div className="sync-status"><span className="sync-dot" />共有ワークスペースとリアルタイム同期中{syncing && " ..."}</div>}{isSupabaseConfigured && workspaceId && records.length > 0 && <PublicSharePanel workspaceId={workspaceId} />}{isSupabaseConfigured && !workspaceId && records.length > 0 && <GuestPublishPanel records={records} />}{records.length === 0 ? <section className="empty-state"><RotateCcw size={28} /><h2>{isSupabaseConfigured && !workspaceId ? "ログインして共有を開始" : "対戦データを待っています"}</h2><p>{isSupabaseConfigured && !workspaceId ? "メールアドレスへログインリンクを送信すると、共有ワークスペースに参加できます。" : "上のアップロードエリアから、指定形式のCSVまたはTSVを読み込んでください。"}</p><code>日付(YYYY-MM-DD),表示日時,自分デッキ,相手デッキ,手番,勝敗,メモ</code></section> : <><SummaryCards total={filteredRecords.length} wins={wins} losses={filteredRecords.length - wins} decks={decks.length} /><FilterPanel filters={filters} decks={getDecks(records)} onChange={(next) => setFilters((current) => ({ ...current, ...next }))} /><MatchupTable records={filteredRecords} decks={decks} onSelect={setDetail} /><DeckStats records={filteredRecords} /><MatchHistoryTable records={filteredRecords} /></>}</div>{detail && <><button className="drawer-backdrop" onClick={() => setDetail(null)} aria-label="詳細を閉じる" /><MatchupDetail stats={detail} onClose={() => setDetail(null)} /></>}<footer><span>Shadowverse Matchup Analyzer</span><span>{isSupabaseConfigured ? "共有ワークスペースで同期中" : "データはブラウザ内にのみ保存されます"}</span><button onClick={() => window.print()}><Download size={14} /> 印刷 / PDF</button></footer></main>;
}
