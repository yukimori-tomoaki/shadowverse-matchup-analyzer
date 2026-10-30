"use client";

import {
  BarChart3,
  Calendar,
  Database,
  Download,
  ExternalLink,
  Grid3X3,
  Image as ImageIcon,
  Menu,
  Palette,
  RotateCcw,
  X,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CsvUploader } from "@/components/CsvUploader";
import { DeckStats } from "@/components/DeckStats";
import { FilterPanel } from "@/components/FilterPanel";
import { MatchupDetail } from "@/components/MatchupDetail";
import { MatchupTable } from "@/components/MatchupTable";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";
import { EnvironmentManager } from "@/components/EnvironmentManager";
import { ClassIconManager } from "@/components/ClassIconManager";
import { ThemeSelector } from "@/components/ThemeSelector";
import { MobileNav, type MobileTab } from "@/components/MobileNav";
import { DataAnalysisView } from "@/components/DataAnalysisView";
import { MatchupAnalyticsView } from "@/components/MatchupAnalyticsView";
import { useTheme } from "@/hooks/useTheme";
import { appendPublicBoard, loadPublicBoard } from "@/lib/publicBoard";
import {
  filterByEnvironment,
  filterPeriod,
  getDecks,
} from "@/lib/matchupCalculator";
import { fetchEnvironments } from "@/lib/environmentStorage";
import { fetchClassIconSettings } from "@/lib/classIconStorage";
import { findDuplicates, loadMatches, saveMatches } from "@/lib/storage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { MatchFilters, MatchRecord, MatchupStats } from "@/types/match";
import type { MatchupEnvironment } from "@/types/environment";
import type { ClassKey } from "@/types/classIcon";

const initialFilters: MatchFilters = {
  period: "all",
  startDate: "",
  endDate: "",
  myDeck: "",
  turn: "all",
};

export default function Home() {
  const { theme, setTheme } = useTheme();

  // Core Data
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [filters, setFilters] = useState<MatchFilters>(initialFilters);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState<MatchupStats | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Environments
  const [environments, setEnvironments] = useState<MatchupEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | "all">("all");
  const [showEnvManager, setShowEnvManager] = useState(false);

  // Class Icons
  const [classIcons, setClassIcons] = useState<Record<ClassKey, string>>({} as Record<ClassKey, string>);
  const [showClassIconManager, setShowClassIconManager] = useState(false);

  // Theme Selector Modal
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // UI State
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("matchup");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Initial load: records, environments, class icons
  useEffect(() => {
    const stored = loadMatches();
    if (stored.length > 0) startTransition(() => setRecords(stored));

    // Fetch environments
    void fetchEnvironments().then((envs) => {
      setEnvironments(envs);
      const defaultEnv = envs.find((e) => e.isDefault);
      if (defaultEnv) {
        setSelectedEnvId(defaultEnv.id);
      }
    });

    // Fetch class icons
    void fetchClassIconSettings().then(setClassIcons);

    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;
    let active = true;
    startTransition(() => setSyncing(true));

    void loadPublicBoard()
      .then((next) => {
        if (active) setRecords(next);
      })
      .catch(() => {
        if (active) setMessage("共有データを読み込めませんでした。Supabaseの設定を確認してください。");
      })
      .finally(() => {
        if (active) setSyncing(false);
      });

    // Realtime subscriptions
    const matchesChannel = client
      .channel("public-board-matches-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_board_matches" },
        () => {
          void loadPublicBoard().then(setRecords);
        }
      )
      .subscribe();

    const envChannel = client
      .channel("matchup-environments-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matchup_environments" },
        () => {
          void fetchEnvironments().then(setEnvironments);
        }
      )
      .subscribe();

    const iconChannel = client
      .channel("class-icons-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "class_icon_settings" },
        () => {
          void fetchClassIconSettings().then(setClassIcons);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(matchesChannel);
      void client.removeChannel(envChannel);
      void client.removeChannel(iconChannel);
    };
  }, []);

  // 1. Filter by Game Environment
  const selectedEnv = useMemo(() => {
    if (selectedEnvId === "all") return null;
    return environments.find((e) => e.id === selectedEnvId) ?? null;
  }, [environments, selectedEnvId]);

  const envRecords = useMemo(() => {
    return filterByEnvironment(records, selectedEnv);
  }, [records, selectedEnv]);

  // 2. Filter by Period within Environment
  const inPeriodRecords = useMemo(() => {
    return filterPeriod(envRecords, filters.period, filters.startDate, filters.endDate);
  }, [envRecords, filters.period, filters.startDate, filters.endDate]);

  const periodDecks = useMemo(() => getDecks(inPeriodRecords), [inPeriodRecords]);

  // 表示対象の行デッキ（使用デッキ複数選択フィルター適用）
  const rowDecks = useMemo(() => {
    if (filters.selectedDecks === undefined) {
      return periodDecks;
    }
    return periodDecks.filter((deck) => filters.selectedDecks!.includes(deck));
  }, [periodDecks, filters.selectedDecks]);

  const columnDecks = periodDecks;

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
      setMessage(
        duplicates
          ? `${incoming.length}件を追加しました。完全一致する重複候補が${duplicates}件あります。`
          : `${incoming.length}件を追加しました。`
      );
    } catch (error) {
      console.error("Supabase保存エラー:", error);
      const detailMsg = error instanceof Error ? error.message : "";
      setMessage(
        detailMsg
          ? `データを共有サーバーへ保存できませんでした。（${detailMsg}）`
          : "データを共有サーバーへ保存できませんでした。"
      );
    } finally {
      setSyncing(false);
    }
  };

  const environmentNote = selectedEnv ? (selectedEnv.isDefault ? "今環境" : selectedEnv.name) : "全期間";

  return (
    <main className="app-shell">
      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Database size={20} />
          </div>
          <div>
            <p className="brand-kicker">SHADOWVERSE / MATCH ANALYTICS</p>
            <h1>Matchup Analyzer</h1>
          </div>
        </div>

        <div className="top-actions">
          <span className="local-badge">
            <span />
            ログイン不要・共有ボード
          </span>

          {/* Menu Button (Desktop & Mobile) */}
          <button
            type="button"
            className="hamburger-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="メニューを開く"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", width: "auto" }}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            <span style={{ fontSize: "13px", fontWeight: 600 }}>メニュー</span>
          </button>
        </div>
      </header>

      {/* Dropdown Menu (Accessible on both Desktop & Mobile) */}
      {isMenuOpen && (
        <>
          <div className="env-dropdown-backdrop" onClick={() => setIsMenuOpen(false)} />
          <div className="header-menu-dropdown">
            <button
              type="button"
              className={`header-menu-item ${activeMobileTab === "matchup" ? "active" : ""}`}
              onClick={() => {
                setActiveMobileTab("matchup");
                setIsMenuOpen(false);
              }}
            >
              <Grid3X3 size={16} /> 相性表
            </button>
            <button
              type="button"
              className={`header-menu-item ${activeMobileTab === "data" ? "active" : ""}`}
              onClick={() => {
                setActiveMobileTab("data");
                setIsMenuOpen(false);
              }}
            >
              <BarChart3 size={16} /> データ分析
            </button>
            <button
              type="button"
              className="header-menu-item"
              onClick={() => {
                setShowThemeSelector(true);
                setIsMenuOpen(false);
              }}
            >
              <Palette size={16} /> テーマ設定
            </button>
            <button
              type="button"
              className="header-menu-item"
              onClick={() => {
                setShowClassIconManager(true);
                setIsMenuOpen(false);
              }}
            >
              <ImageIcon size={16} /> クラス画像管理
            </button>
            <button
              type="button"
              className="header-menu-item"
              onClick={() => {
                setShowEnvManager(true);
                setIsMenuOpen(false);
              }}
            >
              <Calendar size={16} /> ゲーム環境管理
            </button>
            <Link
              href="/share"
              className="header-menu-item"
              onClick={() => setIsMenuOpen(false)}
            >
              <ExternalLink size={16} /> 公開ページ (/share)
            </Link>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="content">
        {/* Environment Bar (Shown prominently on both Mobile & Desktop) */}
        <div className="env-bar-container">
          <EnvironmentSelector
            environments={environments}
            selectedEnvironmentId={selectedEnvId}
            onSelectEnvironment={setSelectedEnvId}
            onOpenManager={() => setShowEnvManager(true)}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isSupabaseConfigured && (
              <div className="sync-status" style={{ margin: 0 }}>
                <span className="sync-dot" />
                共有同期中{syncing && " ..."}
              </div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <section className="hero">
          <div>
            <p className="eyebrow">REALTIME MATCH DATA COMMAND CENTER</p>
            <h2>
              対戦結果を、<em>勝ち筋</em>に変える。
            </h2>
            <p className="hero-copy">
              CSVを読み込むと共有DBへ追加され、閲覧者の相性表にもリアルタイムで反映されます。
            </p>
          </div>
        </section>

        {/* CSV Uploader */}
        <CsvUploader
          hasRecords={records.length > 0}
          onRecords={(next) => void addRecords(next)}
          onError={setMessage}
        />

        {message && (
          <div
            className={`notice ${
              message.includes("エラー") ||
              message.includes("読み込めません") ||
              message.includes("保存できません")
                ? "error"
                : ""
            }`}
          >
            <span>{message}</span>
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {records.length === 0 ? (
          <section className="empty-state">
            <RotateCcw size={28} />
            <h2>共有対戦データを待っています</h2>
            <p>
              CSVを読み込むと、共有DBへ追加されます。閲覧者は固定URLから最新の相性表を見られます。
            </p>
            <code>公開閲覧URL: /share</code>
          </section>
        ) : (
          <>
            {/* 相性ページ: 相性表のマトリクス表示機能のみ */}
            {activeMobileTab === "matchup" && (
              <>
                <FilterPanel
                  filters={filters}
                  decks={periodDecks}
                  deckLabel="使用デッキ"
                  classIcons={classIcons}
                  showClass={false}
                  showDeck={false}
                  showMultiDeck={true}
                  showTurn={false}
                  showExcludeMirror={false}
                  collapsible={true}
                  defaultExpanded={false}
                  onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
                />

                {rowDecks.length > 0 && columnDecks.length > 0 ? (
                  <MatchupTable
                    records={inPeriodRecords}
                    rowDecks={rowDecks}
                    columnDecks={columnDecks}
                    turnFilter={filters.turn}
                    classIcons={classIcons}
                    selectedDeck={filters.myDeck}
                    onSelect={setDetail}
                    onSelectDeck={(deck) => setFilters((prev) => ({ ...prev, myDeck: deck }))}
                  />
                ) : (
                  <div
                    className="panel"
                    style={{
                      textAlign: "center",
                      padding: "48px 20px",
                      color: "var(--muted)",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "14px" }}>
                      {filters.selectedDecks !== undefined && filters.selectedDecks.length === 0
                        ? "使用デッキが選択されていません。「使用デッキ」フィルターから1つ以上のデッキを選択してください。"
                        : "指定された条件に一致する対戦データがありません。表示条件を変更してください。"}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* データページ: デッキ相性データ + 戦績データ分析 + デッキ別パフォーマンス */}
            {activeMobileTab === "data" && (
              <>
                {/* デッキ相性データ (ドーナツチャート・得意苦手対面) */}
                <MatchupAnalyticsView
                  records={inPeriodRecords}
                  allDecks={periodDecks}
                  selectedDeck={filters.myDeck}
                  onSelectDeck={(deck) => setFilters((prev) => ({ ...prev, myDeck: deck }))}
                  period={filters.period}
                  onSelectPeriod={(p) => setFilters((prev) => ({ ...prev, period: p }))}
                  turnFilter={filters.turn}
                  classIcons={classIcons}
                  onSelectStats={setDetail}
                />

                {/* 戦績データ分析 (最多使用デッキ・総合サマリー・他使用デッキ・環境シェアTop3) */}
                <DataAnalysisView
                  records={inPeriodRecords}
                  environmentName={environmentNote}
                  classIcons={classIcons}
                />

                {/* デッキ別パフォーマンス */}
                <DeckStats records={inPeriodRecords} />
              </>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      {detail && (
        <>
          <button
            className="drawer-backdrop"
            onClick={() => setDetail(null)}
            aria-label="詳細を閉じる"
          />
          <MatchupDetail stats={detail} onClose={() => setDetail(null)} />
        </>
      )}

      {/* Environment Manager Modal */}
      {showEnvManager && (
        <EnvironmentManager
          environments={environments}
          onEnvironmentsChange={setEnvironments}
          onClose={() => setShowEnvManager(false)}
        />
      )}

      {/* Class Icon Manager Modal */}
      {showClassIconManager && (
        <ClassIconManager
          icons={classIcons}
          onIconsChange={setClassIcons}
          onClose={() => setShowClassIconManager(false)}
        />
      )}

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <ThemeSelector
          currentTheme={theme}
          onSelectTheme={setTheme}
          onClose={() => setShowThemeSelector(false)}
        />
      )}

      {/* Mobile Bottom Navigation (相性 vs データ分析 vs 環境管理) */}
      <MobileNav
        activeTab={activeMobileTab}
        onTabChange={(tab) => {
          setActiveMobileTab(tab);
          if (tab === "environments") {
            setShowEnvManager(true);
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        showEnvironmentTab={true}
      />

      {/* Footer */}
      <footer>
        <span>Shadowverse Matchup Analyzer</span>
        <span>ログイン不要・共有DBと同期</span>
        <button onClick={() => window.print()}>
          <Download size={14} /> 印刷 / PDF
        </button>
      </footer>
    </main>
  );
}
