"use client";

import {
  BarChart3,
  Database,
  Eye,
  Grid3X3,
  Menu,
  Palette,
  ShieldAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DeckStats } from "@/components/DeckStats";
import { FilterPanel } from "@/components/FilterPanel";
import { MatchupDetail } from "@/components/MatchupDetail";
import { MatchupTable } from "@/components/MatchupTable";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { MobileNav, type MobileTab } from "@/components/MobileNav";
import { DataAnalysisView } from "@/components/DataAnalysisView";
import { MatchupAnalyticsView } from "@/components/MatchupAnalyticsView";
import { useTheme } from "@/hooks/useTheme";
import { DEFAULT_SHARE_PERIOD } from "@/constants/decks";
import {
  filterByEnvironment,
  filterPeriod,
  getDecks,
} from "@/lib/matchupCalculator";
import { fetchEnvironments } from "@/lib/environmentStorage";
import { fetchClassIconSettings } from "@/lib/classIconStorage";
import { loadPublicBoard } from "@/lib/publicBoard";
import { supabase } from "@/lib/supabase";
import type { MatchFilters, MatchRecord, MatchupStats } from "@/types/match";
import type { MatchupEnvironment } from "@/types/environment";
import type { ClassKey } from "@/types/classIcon";

const initialShareFilters: MatchFilters = {
  period: DEFAULT_SHARE_PERIOD,
  startDate: "",
  endDate: "",
  myDeck: "",
  turn: "all",
};

export default function PublicBoardPage() {
  const { theme, setTheme } = useTheme();

  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [filters, setFilters] = useState<MatchFilters>(initialShareFilters);
  const [detail, setDetail] = useState<MatchupStats | null>(null);
  const [error, setError] = useState("");

  // Environments
  const [environments, setEnvironments] = useState<MatchupEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | "all">("all");

  // Class Icons
  const [classIcons, setClassIcons] = useState<Record<ClassKey, string>>({} as Record<ClassKey, string>);

  // Theme modal
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // UI State
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("matchup");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
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

    if (!supabase) return;
    const client = supabase;
    let active = true;

    const refresh = () => {
      void loadPublicBoard()
        .then((next) => {
          if (active) setRecords(next);
        })
        .catch(() => {
          if (active) setError("共有相性表を読み込めませんでした。");
        });
    };
    refresh();

    const channel = client
      .channel("public-board-view")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_board_matches" },
        refresh
      )
      .subscribe();

    const envChannel = client
      .channel("public-board-envs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matchup_environments" },
        () => {
          void fetchEnvironments().then(setEnvironments);
        }
      )
      .subscribe();

    const iconChannel = client
      .channel("public-board-icons")
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
      void client.removeChannel(channel);
      void client.removeChannel(envChannel);
      void client.removeChannel(iconChannel);
    };
  }, []);

  // 1. 環境フィルター
  const selectedEnv = useMemo(() => {
    if (selectedEnvId === "all") return null;
    return environments.find((e) => e.id === selectedEnvId) ?? null;
  }, [environments, selectedEnvId]);

  const envRecords = useMemo(() => {
    return filterByEnvironment(records, selectedEnv);
  }, [records, selectedEnv]);

  // 2. 期間フィルター & 同デッキ対戦（ミラーマッチ）の常時除外
  const displayRecords = useMemo(() => {
    const inPeriod = filterPeriod(envRecords, filters.period, filters.startDate, filters.endDate);
    return inPeriod.filter((r) => r.myDeck !== r.opponentDeck);
  }, [envRecords, filters.period, filters.startDate, filters.endDate]);

  // 期間内・ミラー除外後の全デッキ一覧（相手列デッキに使用）
  const periodDecks = useMemo(() => getDecks(displayRecords), [displayRecords]);

  // 表示対象の行デッキ（使用デッキ複数選択フィルター適用）
  const rowDecks = useMemo(() => {
    if (filters.selectedDecks === undefined) {
      return periodDecks;
    }
    return periodDecks.filter((deck) => filters.selectedDecks!.includes(deck));
  }, [periodDecks, filters.selectedDecks]);

  const columnDecks = periodDecks;
  const environmentNote = selectedEnv ? (selectedEnv.isDefault ? "今環境" : selectedEnv.name) : "全期間";

  if (error) {
    return (
      <main className="public-shell">
        <div className="public-error">
          <ShieldAlert size={32} />
          <h1>公開ページを表示できません</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="public-shell">
      <header className="public-header">
        <div className="brand">
          <div className="brand-mark">
            <Database size={20} />
          </div>
          <div>
            <p className="brand-kicker">SHADOWVERSE / PUBLIC BOARD</p>
            <h1>Matchup Analyzer</h1>
          </div>
        </div>

        <div className="top-actions">
          <span className="public-badge">
            <Eye size={14} />常時公開・閲覧専用
          </span>
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

      {/* Dropdown Menu for Public Page */}
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
          </div>
        </>
      )}

      <div className="public-content">
        {/* Environment Bar */}
        <div className="env-bar-container">
          <EnvironmentSelector
            environments={environments}
            selectedEnvironmentId={selectedEnvId}
            onSelectEnvironment={setSelectedEnvId}
          />
        </div>

        <div className="public-title">
          <div>
            <p className="eyebrow">REALTIME SHARED MATCHUP MATRIX</p>
            <h2>デッキ別相性表</h2>
            <p>共有DBに登録された対戦結果をリアルタイムで表示しています。</p>
          </div>
          <div className="total-matches">
            <strong>
              {displayRecords.length.toLocaleString()}
              <br />
              <small>MATCHES</small>
            </strong>
          </div>
        </div>

        {records.length > 0 ? (
          <>
            {/* 相性ページ: 相性表マトリクスのみ */}
            {activeMobileTab === "matchup" && (
              <>
                <FilterPanel
                  filters={filters}
                  decks={periodDecks}
                  deckLabel="使用デッキ"
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
                    records={displayRecords}
                    rowDecks={rowDecks}
                    columnDecks={columnDecks}
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
                  records={displayRecords}
                  allDecks={periodDecks}
                  selectedDeck={filters.myDeck}
                  onSelectDeck={(deck) => setFilters((prev) => ({ ...prev, myDeck: deck }))}
                  period={filters.period as "all" | "today" | "7days" | "30days"}
                  onSelectPeriod={(p) => setFilters((prev) => ({ ...prev, period: p }))}
                  classIcons={classIcons}
                  onSelectStats={setDetail}
                />

                {/* 戦績データ分析 (最多使用デッキ・総合サマリー・他使用デッキ・環境シェアTop3) */}
                <DataAnalysisView
                  records={displayRecords}
                  environmentName={environmentNote}
                  classIcons={classIcons}
                />

                {/* デッキ別パフォーマンス */}
                <DeckStats records={displayRecords} decks={rowDecks} />
              </>
            )}
          </>
        ) : (
          <div className="public-loading">共有データを読み込んでいます...</div>
        )}
      </div>

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

      {/* Theme Selector Modal */}
      {showThemeSelector && (
        <ThemeSelector
          currentTheme={theme}
          onSelectTheme={setTheme}
          onClose={() => setShowThemeSelector(false)}
        />
      )}

      {/* Mobile Nav */}
      <MobileNav
        activeTab={activeMobileTab}
        onTabChange={(tab) => {
          setActiveMobileTab(tab);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        showEnvironmentTab={false}
      />
    </main>
  );
}
