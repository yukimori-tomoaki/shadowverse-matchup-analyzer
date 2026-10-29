"use client";

import { ArrowDownUp, List } from "lucide-react";
import { useState } from "react";
import type { MatchRecord } from "@/types/match";
import { ClassIcon } from "@/components/ClassIcon";

export function MatchHistoryTable({ records }: { records: MatchRecord[] }) {
  const [sort, setSort] = useState<keyof MatchRecord>("date");
  const latestRecords = [...records].sort((a, b) => b.date.localeCompare(a.date, "ja")).slice(0, 50);
  const sorted = latestRecords.sort((a, b) => String(a[sort]).localeCompare(String(b[sort]), "ja"));

  return (
    <section className="panel history-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><List size={14} /> MATCH HISTORY</span>
          <h2>対戦履歴</h2>
        </div>
        <span className="muted">最新{Math.min(50, records.length)}件 / 全{records.length.toLocaleString()}件</span>
      </div>
      <div className="history-scroll">
        <table className="history">
          <thead>
            <tr>
              {[
                ["date", "記録日時"],
                ["format", "フォーマット"],
                ["myDeck", "自分デッキ"],
                ["opponentDeck", "相手デッキ"],
                ["turn", "手番"],
                ["result", "勝敗"],
                ["memo", "メモ"],
              ].map(([key, label]) => (
                <th key={key}>
                  <button onClick={() => setSort(key as keyof MatchRecord)}>
                    {label}
                    <ArrowDownUp size={12} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((record) => (
              <tr key={record.id}>
                <td>{record.date}</td>
                <td>{record.format || "—"}</td>
                <td>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ClassIcon deckName={record.myDeck} size={18} showBadge />
                    <span>{record.myDeck}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ClassIcon deckName={record.opponentDeck} size={18} showBadge />
                    <span>{record.opponentDeck}</span>
                  </div>
                </td>
                <td>{record.turn}</td>
                <td>
                  <span className={`result ${record.result.toLowerCase()}`}>{record.result}</span>
                </td>
                <td className="memo">{record.memo || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length > 50 && (
        <p className="table-note">最新50件を表示しています。CSVデータ自体は保持されています。</p>
      )}
    </section>
  );
}
