import { X } from "lucide-react";
import type { MatchupStats } from "@/types/match";

export function MatchupDetail({ stats, onClose }: { stats: MatchupStats; onClose: () => void }) {
  const rate = (wins: number, total: number) => total ? `${((wins / total) * 100).toFixed(1)}%` : "N/A";
  return <aside className="detail-drawer"><button className="icon-button close-button" onClick={onClose} aria-label="閉じる"><X size={18} /></button><span className="eyebrow">MATCHUP DETAIL</span><p className="detail-kicker">対戦詳細</p><h2>{stats.myDeck}</h2><div className="versus">VS <span>{stats.opponentDeck}</span></div><div className="detail-rate">{stats.total ? `${stats.winRate.toFixed(1)}%` : "N/A"}<small>勝率</small></div><div className="detail-record"><span><b>{stats.wins}</b>勝</span><span><b>{stats.losses}</b>敗</span><span><b>{stats.total}</b>戦</span></div><div className="turn-breakdown"><div><span>先攻勝率</span><b>{rate(stats.firstWins, stats.firstTotal)}</b><small>{stats.firstTotal}戦</small></div><div><span>後攻勝率</span><b>{rate(stats.secondWins, stats.secondTotal)}</b><small>{stats.secondTotal}戦</small></div></div></aside>;
}
