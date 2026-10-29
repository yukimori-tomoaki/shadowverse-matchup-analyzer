"use client";

import {
  Database,
  Eye,
  Grid3X3,
  List as ListIcon,
  Palette,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DeckStats } from "@/components/DeckStats";
import { FilterPanel } from "@/components/FilterPanel";
import { MatchupDetail } from "@/components/MatchupDetail";
import { MatchupTable } from "@/components/MatchupTable";
import { MatchupList } from "@/components/MatchupList";
import { EnvironmentSelector } from "@/components/EnvironmentSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { MobileNav, type MobileTab } from "@/components/MobileNav";
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

  // View Mode: list vs matrix
  const [viewMode, setViewMode] = useState<"list" | "matrix">("matrix");
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("matchup");

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

  // Primary deck for list view
  const activeDeckForList = useMemo(() => {
    if (filters.myDeck) return filters.myDeck;
    if (rowDecks.length > 0) return rowDecks[0];
    return "";
  }, [filters.myDeck, rowDecks]);

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
            className="button button-ghost"
            onClick={() => setShowThemeSelector(true)}
            title="テーマ変更"
          >
            <Palette size={15} /> テーマ
          </button>
        </div>
      </header>

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

            {/* View Switcher on Mobile/Public */}
            <div className="view-switch-group">
              <button
                type="button"
                className={`view-switch-btn ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
              >
                <ListIcon size={16} />
                <span>リスト</span>
              </button>
              <button
                type="button"
                className={`view-switch-btn ${viewMode === "matrix" ? "active" : ""}`}
                onClick={() => setViewMode("matrix")}
              >
                <Grid3X3 size={16} />
                <span>相性表</span>
              </button>
            </div>

            {rowDecks.length > 0 && columnDecks.length > 0 ? (
              <>
                {viewMode === "list" ? (
                  <MatchupList
                    records={displayRecords}
                    activeDeck={activeDeckForList}
                    opponentDecks={columnDecks}
                    classIcons={classIcons}
                    turnFilter={filters.turn}
                    onSelect={setDetail}
                  />
                ) : (
                  <MatchupTable
                    records={displayRecords}
                    rowDecks={rowDecks}
                    columnDecks={columnDecks}
                    classIcons={classIcons}
                    onSelect={setDetail}
                  />
                )}
                <DeckStats records={displayRecords} decks={rowDecks} />
              </>
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
          if (tab === "matchup") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else if (tab === "data") {
            const dataEl = document.querySelector(".deck-stats-grid");
            if (dataEl) dataEl.scrollIntoView({ behavior: "smooth" });
          }
        }}
        showEnvironmentTab={false}
      />
    </main>
  );
}
