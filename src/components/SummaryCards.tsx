import { BarChart3, Layers3, Shield, Swords } from "lucide-react";

export function SummaryCards({ total, wins, losses, decks }: { total: number; wins: number; losses: number; decks: number }) {
  const cards = [{ label: "総対戦数", value: total.toLocaleString(), note: "全期間", icon: Swords, className: "cyan" }, { label: "勝利", value: wins.toLocaleString(), note: total ? `${((wins / total) * 100).toFixed(1)}%` : "0.0%", icon: Shield, className: "green" }, { label: "敗北", value: losses.toLocaleString(), note: total ? `${((losses / total) * 100).toFixed(1)}%` : "0.0%", icon: BarChart3, className: "orange" }, { label: "登録デッキ数", value: decks.toLocaleString(), note: "自分・相手", icon: Layers3, className: "blue" }];
  return <section className="summary-grid">{cards.map(({ label, value, note, icon: Icon, className }) => <article className={`summary-card ${className}`} key={label}><div className="summary-card-top"><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{note}</small></article>)}</section>;
}
