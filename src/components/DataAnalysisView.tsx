"use client";

import React, { useRef, useState } from "react";
import { BarChart3, Calendar, Download, Flame, Trophy } from "lucide-react";
import html2canvas from "html2canvas";
import type { MatchRecord } from "@/types/match";
import type { ClassKey } from "@/types/classIcon";
import {
  calculateDeckUsageStats,
  calculateMaxStreak,
  calculateOpponentShare,
} from "@/lib/matchupCalculator";
import { getDeckClassKey } from "@/constants/classIcons";
import { ClassIcon } from "@/components/ClassIcon";

export type DataAnalysisViewProps = {
  records: MatchRecord[];
  environmentName?: string;
  classIcons?: Record<ClassKey, string>;
};

// クラス別のアクセントカラー
const CLASS_COLORS: Record<string, string> = {
  エルフ: "#10b981", // 緑
  ロイヤル: "#eab308", // 黄
  ウィッチ: "#a855f7", // 紫
  ドラゴン: "#f97316", // 橙
  ナイトメア: "#ec4899", // ピンク/紫
  ネクロマンサー: "#ec4899",
  ヴァンパイア: "#e11d48",
  ビショップ: "#38bdf8", // 水色
  ネメシス: "#06b6d4", // シアン
  ニュートラル: "#94a3b8",
};

function getClassColor(deckName: string): string {
  for (const [cls, color] of Object.entries(CLASS_COLORS)) {
    if (deckName.includes(cls)) return color;
  }
  return "#38bdf8";
}

export function DataAnalysisView({
  records,
  environmentName = "今シーズン",
  classIcons,
}: DataAnalysisViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const totalMatches = records.length;
  const wins = records.filter((r) => r.result === "WIN").length;
  const losses = totalMatches - wins;
  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  const maxStreak = calculateMaxStreak(records);

  const usageStats = calculateDeckUsageStats(records);
  const topDeck = usageStats[0] ?? null;
  const otherDecks = usageStats.slice(1);

  const opponentShares = calculateOpponentShare(records).slice(0, 5);

  const handleDownload = async () => {
    if (!cardRef.current || downloading) return;
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0d1117",
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `shadowverse-stats-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("画像ダウンロードエラー:", err);
      alert("画像の生成に失敗しました。");
    } finally {
      setDownloading(false);
    }
  };

  if (totalMatches === 0) {
    return (
      <section className="panel data-analysis-empty">
        <BarChart3 size={32} className="muted" />
        <h3>戦績データがありません</h3>
        <p className="muted">CSVから対戦データを読み込むと、デッキ別勝率や環境シェアの分析が表示されます。</p>
      </section>
    );
  }

  return (
    <div className="data-analysis-container">
      {/* キャプチャ対象の戦績カード */}
      <div className="stats-report-card" ref={cardRef}>
        {/* カードヘッダー */}
        <div className="report-card-header">
          <div className="report-title-group">
            <span className="report-icon-box">
              <Calendar size={18} />
            </span>
            <h2 className="report-title">戦績データ分析</h2>
          </div>
          <div className="report-env-badge">
            <span>🔄 {environmentName}</span>
          </div>
        </div>

        {/* 最多使用デッキ カード */}
        {topDeck && (
          <div
            className="top-deck-hero-card"
            style={{ borderColor: getClassColor(topDeck.deckName) }}
          >
            <div className="top-deck-badge-icon">
              <Trophy size={24} color="#eab308" />
            </div>
            <div className="top-deck-body">
              <span className="top-deck-kicker">最多使用デッキ</span>
              <div className="top-deck-title-row">
                <ClassIcon
                  deckName={topDeck.deckName}
                  size={24}
                  customUrl={
                    classIcons
                      ? classIcons[getDeckClassKey(topDeck.deckName) as ClassKey]
                      : undefined
                  }
                  showBadge
                />
                <h3
                  className="top-deck-name"
                  style={{ color: getClassColor(topDeck.deckName) }}
                >
                  {topDeck.deckName}
                </h3>
              </div>
              <p className="top-deck-sub">
                {topDeck.total}戦 {topDeck.wins}勝{topDeck.losses}敗
              </p>
            </div>
            <div className="top-deck-rate-box">
              <span className="rate-label">勝率</span>
              <div className="rate-value-group">
                <strong className="rate-num">{topDeck.winRate.toFixed(0)}</strong>
                <span className="rate-percent">%</span>
              </div>
            </div>
          </div>
        )}

        {/* 総合戦績 3連サマリー */}
        <div className="report-summary-triad">
          <div className="triad-card">
            <span className="triad-label">戦績</span>
            <div className="triad-val">
              <strong>{totalMatches}</strong>
              <small>戦</small>
              <span className="triad-sep">|</span>
              <strong className="triad-win">{wins}</strong>
              <small>勝</small>
              <strong className="triad-loss">{losses}</strong>
              <small>敗</small>
            </div>
          </div>

          <div className="triad-card">
            <span className="triad-label">全体の勝率</span>
            <div className="triad-val triad-highlight-cyan">
              <strong>{winRate.toFixed(0)}</strong>
              <small>%</small>
            </div>
          </div>

          <div className="triad-card">
            <span className="triad-label">最高連勝数</span>
            <div className="triad-val triad-highlight-pink">
              <Flame size={18} style={{ color: "#ec4899" }} />
              <strong>{maxStreak}</strong>
              <small>連勝</small>
            </div>
          </div>
        </div>

        {/* 他の使用デッキ グリッド */}
        {otherDecks.length > 0 && (
          <div className="other-decks-section">
            <div className="section-label-bar">
              <span className="section-bar-line" />
              <h4>他の使用デッキ</h4>
            </div>

            <div className="other-decks-grid">
              {otherDecks.map((deck) => {
                const color = getClassColor(deck.deckName);
                return (
                  <div
                    key={deck.deckName}
                    className="other-deck-card"
                    style={{ borderLeftColor: color }}
                  >
                    <div className="other-deck-info">
                      <div className="other-deck-name-row">
                        <span className="rank-num">#{deck.rank}</span>
                        <strong className="other-deck-name" style={{ color }}>
                          {deck.deckName}
                        </strong>
                      </div>
                      <span className="other-deck-sub">
                        {deck.total}戦 {deck.wins}勝{deck.losses}敗
                      </span>
                    </div>
                    <div className="other-deck-rate">
                      <strong>{deck.winRate.toFixed(0)}</strong>
                      <span>%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 環境シェア Top 3 */}
        {opponentShares.length > 0 && (
          <div className="env-share-section">
            <div className="section-label-bar">
              <span className="section-bar-line" style={{ background: "#ec4899" }} />
              <h4>環境シェア Top {Math.min(opponentShares.length, 3)}</h4>
            </div>

            <div className="env-share-list">
              {opponentShares.slice(0, 3).map((item) => {
                const color = getClassColor(item.deckName);
                return (
                  <div key={item.deckName} className="env-share-item">
                    <div className="env-share-info-row">
                      <div className="share-deck-title">
                        <span className="rank-badge">#{item.rank}</span>
                        <strong style={{ color }}>{item.deckName}</strong>
                      </div>
                      <div className="share-percent-text">
                        <strong>{item.sharePercent.toFixed(0)}%</strong>
                        <span>({item.total}戦)</span>
                      </div>
                    </div>
                    <div className="share-bar-track">
                      <div
                        className="share-bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(4, item.sharePercent))}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 戦績カードを画像でダウンロード ボタン */}
      <div className="download-btn-container">
        <button
          type="button"
          className="download-report-btn"
          onClick={() => void handleDownload()}
          disabled={downloading}
        >
          <Download size={18} />
          <span>{downloading ? "画像を生成中..." : "戦績カードを画像でダウンロード"}</span>
        </button>
      </div>
    </div>
  );
}
