import { BarChart3, Layers3, Shield, Swords } from "lucide-react";

export type SummaryCardsProps = {
  total: number;
  wins: number;
  losses: number;
  decks: number;
  environmentNote?: string;
  periodNote?: string;
};

export function SummaryCards({
  total,
  wins,
  losses,
  decks,
  environmentNote,
  periodNote,
}: SummaryCardsProps) {
  const winPercent = total ? `${((wins / total) * 100).toFixed(1)}%` : "0.0%";

  const cards = [
    {
      label: "総対戦数",
      value: total.toLocaleString(),
      note: environmentNote ?? "全期間",
      icon: Swords,
      className: "cyan",
    },
    {
      label: "総合勝率",
      value: winPercent,
      note: environmentNote ? `${wins}勝 / ${losses}敗` : `${wins}勝 (${winPercent})`,
      icon: Shield,
      className: "green",
    },
    {
      label: "集計期間",
      value: periodNote ?? "全期間",
      note: environmentNote ?? "指定環境",
      icon: BarChart3,
      className: "orange",
    },
    {
      label: "登録デッキ数",
      value: decks.toLocaleString(),
      note: "自分・相手",
      icon: Layers3,
      className: "blue",
    },
  ];

  return (
    <section className="summary-grid">
      {cards.map(({ label, value, note, icon: Icon, className }) => (
        <article className={`summary-card ${className}`} key={label}>
          <div className="summary-card-top">
            <span>{label}</span>
            <Icon size={18} />
          </div>
          <strong>{value}</strong>
          <small>{note}</small>
        </article>
      ))}
    </section>
  );
}
