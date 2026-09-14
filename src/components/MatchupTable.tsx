"use client";

import { Download, Grid3X3 } from "lucide-react";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { calculateMatchup, getMyDecks, getOpponentDecks, matchupTone } from "@/lib/matchupCalculator";
import type { MatchRecord, MatchupStats } from "@/types/match";

export function MatchupTable({
  records,
  decks,
  rowDecks,
  columnDecks,
  onSelect,
}: {
  records: MatchRecord[];
  decks?: string[];
  rowDecks?: string[];
  columnDecks?: string[];
  onSelect: (stats: MatchupStats) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [downloading, setDownloading] = useState(false);
const [showFull, setShowFull] = useState(false);
  

  const myRowDecks = rowDecks ?? (decks && decks.length > 0 ? decks : getMyDecks(records));
  const opponentColumnDecks = columnDecks ?? getOpponentDecks(records);

  const handleDownloadPng = async () => {
    if (!panelRef.current || downloading) return;
    try {
      setDownloading(true);
      const scrollEl = panelRef.current.querySelector(".matrix-scroll") as HTMLElement | null;
      const tableEl = panelRef.current.querySelector(".matrix") as HTMLElement | null;

      const originalOverflow = scrollEl ? scrollEl.style.overflow : "";
      const originalPanelWidth = panelRef.current.style.width;
      const originalPanelMaxWidth = panelRef.current.style.maxWidth;

      const tableWidth = tableEl ? tableEl.scrollWidth : 0;
      const requiredWidth = Math.max(tableWidth + 60, panelRef.current.scrollWidth, 1000);

      if (scrollEl) {
        scrollEl.style.overflow = "visible";
      }
      panelRef.current.style.width = `${requiredWidth}px`;
      panelRef.current.style.maxWidth = "none";

      await new Promise((resolve) => setTimeout(resolve, 80));

      const canvas = await html2canvas(panelRef.current as HTMLElement, {
        backgroundColor: "#0c1827",
        scale: 2,
        width: requiredWidth,
        ignoreElements: (element) => element instanceof HTMLElement && element.classList.contains("no-export"),
      });
      const dataUrl = canvas.toDataURL();

      if (scrollEl) {
        scrollEl.style.overflow = originalOverflow;
      }
      panelRef.current.style.width = originalPanelWidth;
      panelRef.current.style.maxWidth = originalPanelMaxWidth;

      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `matchup-matrix-${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("相性表PNGダウンロードエラー:", error);
      alert("相性表のPNG保存に失敗しました。");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="panel matchup-panel" ref={panelRef}>
      <div className="section-heading">
        <div>
          <span className="eyebrow"><Grid3X3 size={14} /> MATCHUP MATRIX</span>
          <h2>デッキ別相性表</h2>
        </div>
        <div className="heading-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="muted no-export">セルを選択して詳細を表示</span>
          <button
            type="button"
            className="button button-ghost no-export"
            onClick={() => void handleDownloadPng()}
            disabled={downloading}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: downloading ? "wait" : "pointer" }}
            title="相性表をPNG画像としてダウンロード"
          >
            <Download size={14} />
            <span>{downloading ? "PNG生成中..." : "PNG保存"}</span>
          </button>
          <button
            type="button"
            className="button button-ghost no-export"
            onClick={() => setShowFull(prev => !prev)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="スクロールモードと全画面モードを切り替え"
          >
            {showFull ? "スクロールモード" : "全画面モード"}
          </button>
        </div>
      </div>
      <div className={"matrix-scroll " + (showFull ? "matrix-full" : "")}>
        <table className="matrix">
          <thead>
            <tr>
              <th>自分＼相手</th>
              {opponentColumnDecks.map((deck) => <th key={deck}>{deck}</th>)}
            </tr>
          </thead>
          <tbody>
            {myRowDecks.map((rowDeck) => (
              
                <tr key={rowDeck}>
                  <th>
                      <div>{rowDeck}</div>
                      <div className="row-stats-text">{(() => {
                        const own = records.filter((r) => r.myDeck === rowDeck);
                        const total = own.length;
                        const wins = own.filter((r) => r.result === "WIN").length;
                        const losses = own.filter((r) => r.result === "LOSS").length;
                        return (
                          <>
                            <span>{`W-${wins} L-${losses}`}</span>
                            <span>{`match ${total}`}</span>
                          </>
                        );
                      })()}</div>
                    </th>
                  {opponentColumnDecks.map((columnDeck) => {
                    if (rowDeck === columnDeck) return <td className="diagonal" key={columnDeck}>—</td>;
                    const stats = calculateMatchup(records, rowDeck, columnDeck);
                    if (stats.total === 0) return <td key={columnDeck} className="matrix-empty" />;
                    const tone = matchupTone(stats.winRate, stats.total);
                    return (
                      <td key={columnDeck}>
                        <button className={`matrix-cell ${tone.tone}`} onClick={() => onSelect(stats)}>
                          <strong>{`${stats.winRate.toFixed(1)}%`}</strong>
                          <span>{stats.wins} - {stats.losses}</span>
                          <small>{stats.total}戦 ・ {tone.label}</small>
                        </button>
                      </td>
                    );
                  })}
                </tr>

              
            ))}

          </tbody>
        </table>
      </div>
      <div className="legend">
        <span><i className="legend-dot strong-win" />大幅有利</span>
        <span><i className="legend-dot win" />有利</span>
        <span><i className="legend-dot even" />五分</span>
        <span><i className="legend-dot loss" />不利</span>
        <span><i className="legend-dot muted" />データ不足</span>
      </div>
    </section>
  );
}
