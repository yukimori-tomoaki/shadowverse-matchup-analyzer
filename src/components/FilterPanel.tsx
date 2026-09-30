import { CalendarDays, Filter } from "lucide-react";
import type { MatchFilters } from "@/types/match";
import { CLASS_ORDER } from "@/constants/decks";

export type FilterPanelProps = {
  filters: MatchFilters;
  decks?: string[];
  deckLabel?: string;
  classes?: readonly string[];
  showPeriod?: boolean;
  showClass?: boolean;
  showDeck?: boolean;
  showTurn?: boolean;
  showExcludeMirror?: boolean;
  onChange: (next: Partial<MatchFilters>) => void;
};

export function FilterPanel({
  filters,
  decks = [],
  deckLabel = "自分デッキ",
  classes = CLASS_ORDER,
  showPeriod = true,
  showClass = false,
  showDeck = true,
  showTurn = true,
  showExcludeMirror = false,
  onChange,
}: FilterPanelProps) {
  return (
    <section className="filter-panel">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow"><Filter size={14} /> FILTERS</span>
          <h2>表示条件</h2>
        </div>
        <span className="filter-hint">条件を変えると集計も更新</span>
      </div>
      <div className="filters">
        {showPeriod && (
          <label>
            期間
            <select
              value={filters.period}
              onChange={(e) => onChange({ period: e.target.value as MatchFilters["period"] })}
            >
              <option value="all">全期間</option>
              <option value="today">今日</option>
              <option value="7days">過去7日</option>
              <option value="30days">過去30日</option>
              <option value="custom">任意期間</option>
            </select>
          </label>
        )}
        {showPeriod && filters.period === "custom" && (
          <>
            <label className="date-field">
              <CalendarDays size={15} />開始日
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => onChange({ startDate: e.target.value })}
              />
            </label>
            <label className="date-field">
              <CalendarDays size={15} />終了日
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
              />
            </label>
          </>
        )}
        {showClass && (
          <label>
            クラス
            <select
              value={filters.selectedClass ?? "all"}
              onChange={(e) => onChange({ selectedClass: e.target.value })}
            >
              <option value="all">すべてのクラス</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </label>
        )}
        {showDeck && (
          <label>
            {deckLabel}
            <select
              value={filters.myDeck}
              onChange={(e) => onChange({ myDeck: e.target.value })}
            >
              <option value="">すべて</option>
              {decks.map((deck) => (
                <option key={deck} value={deck}>
                  {deck}
                </option>
              ))}
            </select>
          </label>
        )}
        {showTurn && (
          <label>
            手番
            <select
              value={filters.turn}
              onChange={(e) => onChange({ turn: e.target.value as MatchFilters["turn"] })}
            >
              <option value="all">すべて</option>
              <option value="先攻">先攻</option>
              <option value="後攻">後攻</option>
            </select>
          </label>
        )}
        {showExcludeMirror && (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={!!filters.excludeMirror}
              onChange={(e) => onChange({ excludeMirror: e.target.checked })}
            />
            <span>同デッキ対戦を除外</span>
          </label>
        )}
      </div>
    </section>
  );
}
