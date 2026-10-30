"use client";

import {
  Check,
  ChevronDown,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClassIcon } from "@/components/ClassIcon";
import { getClassKeyFromName, getDeckClassKey } from "@/constants/classIcons";
import {
  DEFAULT_MAX_VISIBLE_CHIPS,
  filterDecksByQuery,
  getVisibleChips,
  groupDecksByClass,
  normalizeSelectedDecks,
  removeSingleSelectedDeck,
  serializeSelectedDecks,
} from "@/lib/deckFilterUtils";
import type { ClassKey } from "@/types/classIcon";

export type MultiSelectDropdownProps = {
  label: string;
  items: string[];
  selectedItems?: string[];
  classIcons?: Record<ClassKey, string>;
  maxVisibleChips?: number;
  onChange: (selected: string[] | undefined) => void;
};

export function MultiSelectDropdown({
  label,
  items,
  selectedItems,
  classIcons,
  maxVisibleChips = DEFAULT_MAX_VISIBLE_CHIPS,
  onChange,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState<Set<string>>(() =>
    normalizeSelectedDecks(items, selectedItems)
  );
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());

  // 現在適用されている選択状態（一覧に存在するデッキのみ）
  const committedSet = useMemo(
    () => normalizeSelectedDecks(items, selectedItems),
    [items, selectedItems]
  );
  const committedList = useMemo(
    () => items.filter((item) => committedSet.has(item)),
    [items, committedSet]
  );

  const totalCount = items.length;
  const selectedCount = committedList.length;
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;

  // チップ表示用（表示上限 + ほか○件）
  const { visible: visibleChips, hiddenCount } = useMemo(
    () => getVisibleChips(committedList, maxVisibleChips),
    [committedList, maxVisibleChips]
  );

  // ボトムシート / モーダルを開く（現在の適用状態でドラフトを初期化）
  const handleOpen = () => {
    setDraftSelected(normalizeSelectedDecks(items, selectedItems));
    setSearchQuery("");
    setCollapsedClasses(new Set());
    setIsOpen(true);
  };

  // キャンセル（変更を破棄して閉じる）
  const handleCancel = () => {
    setDraftSelected(normalizeSelectedDecks(items, selectedItems));
    setSearchQuery("");
    setIsOpen(false);
  };

  // 適用（ドラフトの変更を確定して閉じる）
  const handleApply = () => {
    const nextValue = serializeSelectedDecks(items, draftSelected);
    onChange(nextValue);
    setSearchQuery("");
    setIsOpen(false);
  };

  // ESCキーでキャンセル、オープン中は背面スクロールを抑制
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDraftSelected(normalizeSelectedDecks(items, selectedItems));
        setSearchQuery("");
        setIsOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, items, selectedItems]);

  // 選択済みチップから1件を即時解除
  const handleRemoveChip = (deck: string) => {
    const next = removeSingleSelectedDeck(items, selectedItems, deck);
    onChange(next);
  };

  // ドラフト内の個別デッキ選択トグル
  const handleToggleDraftDeck = (deck: string) => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(deck)) {
        next.delete(deck);
      } else {
        next.add(deck);
      }
      return next;
    });
  };

  // 全デッキ選択 / 全デッキ解除
  const handleSelectAllDecks = () => {
    setDraftSelected(new Set(items));
  };

  const handleClearAllDecks = () => {
    setDraftSelected(new Set());
  };

  // 検索フィルター適用後のデッキ一覧とクラス別グループ
  const filteredItems = useMemo(
    () => filterDecksByQuery(items, searchQuery),
    [items, searchQuery]
  );

  const classGroups = useMemo(
    () => groupDecksByClass(filteredItems),
    [filteredItems]
  );

  const hasActiveSearch = searchQuery.trim().length > 0;

  // 検索結果のみを一括選択 / 一括解除
  const handleSelectFiltered = () => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      for (const d of filteredItems) next.add(d);
      return next;
    });
  };

  const handleClearFiltered = () => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      for (const d of filteredItems) next.delete(d);
      return next;
    });
  };

  // クラス単位の一括選択 / 一括解除
  const handleToggleClassDecks = (classDecks: string[]) => {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      const allClassSelected = classDecks.every((d) => next.has(d));
      if (allClassSelected) {
        for (const d of classDecks) next.delete(d);
      } else {
        for (const d of classDecks) next.add(d);
      }
      return next;
    });
  };

  // クラス折りたたみトグル
  const handleToggleClassCollapse = (className: string) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  };

  const draftCount = draftSelected.size;
  const isDraftAllSelected = totalCount > 0 && draftCount === totalCount;

  const sheetModal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="deck-sheet-backdrop"
            onClick={handleCancel}
            role="presentation"
          >
            <div
              className="deck-sheet-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deck-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              {/* スマホ用ドラッグハンドル装飾 */}
              <div className="deck-sheet-grabber" aria-hidden="true">
                <span />
              </div>

              {/* 固定ヘッダー：タイトル・選択件数・閉じるボタン */}
              <div className="deck-sheet-header">
                <div className="deck-sheet-title-group">
                  <h3 id="deck-sheet-title" className="deck-sheet-title">
                    デッキ選択
                  </h3>
                  <span className="deck-sheet-live-count">
                    {draftCount} / {totalCount}件 選択中
                  </span>
                </div>
                <button
                  type="button"
                  className="deck-sheet-close-btn"
                  onClick={handleCancel}
                  aria-label="キャンセルして閉じる"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 固定検索＆一括操作バー */}
              <div className="deck-sheet-controls">
                {/* デッキ名検索欄 */}
                <div className="deck-search-box">
                  <Search size={15} className="deck-search-icon" />
                  <input
                    type="text"
                    className="deck-search-input"
                    placeholder="デッキ名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="デッキ名で検索"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="deck-search-clear-btn"
                      onClick={() => setSearchQuery("")}
                      aria-label="検索キーワードをクリア"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* 全選択・全解除ボタン（操作対象を明示） */}
                <div className="deck-bulk-actions">
                  <div className="deck-bulk-main-group">
                    <button
                      type="button"
                      className="deck-bulk-btn"
                      onClick={handleSelectAllDecks}
                      disabled={isDraftAllSelected}
                    >
                      全選択 ({totalCount})
                    </button>
                    <button
                      type="button"
                      className="deck-bulk-btn"
                      onClick={handleClearAllDecks}
                      disabled={draftCount === 0}
                    >
                      全解除
                    </button>
                  </div>

                  {/* 検索中のみ：検索結果に対する一括選択・解除ボタン */}
                  {hasActiveSearch && filteredItems.length > 0 && (
                    <div className="deck-bulk-search-group">
                      <button
                        type="button"
                        className="deck-bulk-btn is-search-scope"
                        onClick={handleSelectFiltered}
                      >
                        検索結果を選択 ({filteredItems.length})
                      </button>
                      <button
                        type="button"
                        className="deck-bulk-btn is-search-scope"
                        onClick={handleClearFiltered}
                      >
                        検索結果を解除
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 独立スクロール領域：クラス別グループ＆2列グリッドデッキ一覧 */}
              <div className="deck-sheet-scroll-body">
                {classGroups.length === 0 ? (
                  <div className="deck-sheet-empty">
                    <p>「{searchQuery}」に一致するデッキが見つかりません。</p>
                  </div>
                ) : (
                  classGroups.map((group) => {
                    const isCollapsed = collapsedClasses.has(group.className);
                    const classKey = getClassKeyFromName(group.className);
                    const selectedInClass = group.decks.filter((d) =>
                      draftSelected.has(d)
                    ).length;
                    const allInClassSelected =
                      group.decks.length > 0 &&
                      selectedInClass === group.decks.length;

                    return (
                      <div key={group.className} className="deck-class-group">
                        {/* クラス見出し（折りたたみ＋クラス一括選択） */}
                        <div className="deck-class-group-header">
                          <button
                            type="button"
                            className="deck-class-collapse-btn"
                            onClick={() =>
                              handleToggleClassCollapse(group.className)
                            }
                            aria-expanded={!isCollapsed}
                          >
                            <ClassIcon
                              className={group.className}
                              size={20}
                              showBadge
                              customUrl={
                                classKey && classIcons
                                  ? classIcons[classKey]
                                  : undefined
                              }
                            />
                            <span className="deck-class-name">
                              {group.className}
                            </span>
                            <span className="deck-class-count">
                              {selectedInClass}/{group.decks.length}
                            </span>
                            <ChevronDown
                              size={15}
                              className={`deck-class-chevron ${
                                isCollapsed ? "collapsed" : ""
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            className="deck-class-toggle-all-btn"
                            onClick={() => handleToggleClassDecks(group.decks)}
                          >
                            {allInClassSelected ? "クラス解除" : "クラス全選択"}
                          </button>
                        </div>

                        {/* 2列グリッドのデッキ一覧 */}
                        {!isCollapsed && (
                          <div className="deck-items-grid">
                            {group.decks.map((deck) => {
                              const isChecked = draftSelected.has(deck);
                              const deckClassKey = getDeckClassKey(deck);
                              return (
                                <button
                                  key={deck}
                                  type="button"
                                  role="checkbox"
                                  aria-checked={isChecked}
                                  className={`deck-grid-item ${
                                    isChecked ? "is-selected" : ""
                                  }`}
                                  onClick={() => handleToggleDraftDeck(deck)}
                                  title={deck}
                                >
                                  <ClassIcon
                                    deckName={deck}
                                    size={20}
                                    showBadge
                                    customUrl={
                                      deckClassKey && classIcons
                                        ? classIcons[deckClassKey]
                                        : undefined
                                    }
                                  />
                                  <span className="deck-grid-item-name">
                                    {deck}
                                  </span>
                                  <span
                                    className={`deck-grid-check ${
                                      isChecked ? "checked" : ""
                                    }`}
                                    aria-hidden="true"
                                  >
                                    {isChecked && (
                                      <Check size={12} strokeWidth={3} />
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 固定フッター：キャンセル・適用ボタン */}
              <div className="deck-sheet-footer">
                <button
                  type="button"
                  className="deck-sheet-cancel-btn"
                  onClick={handleCancel}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="deck-sheet-apply-btn"
                  onClick={handleApply}
                >
                  適用する ({draftCount}件)
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="deck-filter-selector">
      {/* 上段：ラベル・選択中のデッキ数・「デッキを選択する」ボタン */}
      <div className="deck-filter-summary-bar">
        <div className="deck-filter-summary-left">
          <span className="deck-filter-label">{label}</span>
          <span
            className={`deck-filter-count-badge ${
              selectedCount === 0
                ? "is-empty"
                : isAllSelected
                ? "is-all"
                : "is-partial"
            }`}
          >
            {totalCount === 0
              ? "データなし"
              : isAllSelected
              ? `全${totalCount}件 選択中`
              : selectedCount === 0
              ? `未選択 (0/${totalCount}件)`
              : `${selectedCount} / ${totalCount}件 選択中`}
          </span>
        </div>

        <button
          type="button"
          className="deck-selector-open-btn"
          onClick={handleOpen}
          disabled={totalCount === 0}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <Filter size={14} />
          <span>デッキを選択する</span>
        </button>
      </div>

      {/* 下段：選択済みデッキ名のチップ一覧（個別解除対応 + 「ほか○件」省略表示） */}
      <div className="deck-selected-chips-area">
        {totalCount === 0 ? (
          <span className="deck-chips-empty-hint">表示可能なデッキがありません</span>
        ) : selectedCount === 0 ? (
          <span className="deck-chips-empty-hint">
            デッキが選択されていません。「デッキを選択する」から1つ以上選択してください。
          </span>
        ) : (
          <>
            {visibleChips.map((deck) => {
              const classKey = getDeckClassKey(deck);
              return (
                <span key={deck} className="deck-selected-chip" title={deck}>
                  <ClassIcon
                    deckName={deck}
                    size={16}
                    showBadge
                    customUrl={
                      classKey && classIcons ? classIcons[classKey] : undefined
                    }
                  />
                  <span className="deck-chip-name">{deck}</span>
                  <button
                    type="button"
                    className="deck-chip-remove-btn"
                    onClick={() => handleRemoveChip(deck)}
                    aria-label={`${deck}の選択を解除`}
                    title={`${deck}を解除`}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
            {hiddenCount > 0 && (
              <button
                type="button"
                className="deck-chip-more-btn"
                onClick={handleOpen}
                title="タップして選択中のすべてのデッキを確認・変更"
              >
                ほか{hiddenCount}件
              </button>
            )}
          </>
        )}
      </div>

      {sheetModal}
    </div>
  );
}
