"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type MultiSelectDropdownProps = {
  label: string;
  items: string[];
  selectedItems?: string[];
  onChange: (selected: string[] | undefined) => void;
};

export function MultiSelectDropdown({
  label,
  items,
  selectedItems,
  onChange,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const isAllSelected =
    selectedItems === undefined || (items.length > 0 && selectedItems.length === items.length);
  const selectedCount = selectedItems === undefined ? items.length : selectedItems.length;

  const displayText = (() => {
    if (items.length === 0) return "データなし";
    if (isAllSelected) return `すべて (${items.length})`;
    if (selectedCount === 0) return "未選択 (0)";
    if (selectedCount === 1) return selectedItems![0];
    return `${selectedCount}件選択中`;
  })();

  const handleToggle = (item: string) => {
    if (selectedItems === undefined) {
      const next = items.filter((i) => i !== item);
      onChange(next);
      return;
    }

    if (selectedItems.includes(item)) {
      const next = selectedItems.filter((i) => i !== item);
      onChange(next);
    } else {
      const next = [...selectedItems, item];
      if (next.length === items.length) {
        onChange(undefined);
      } else {
        onChange(next);
      }
    }
  };

  const handleSelectAll = () => {
    onChange(undefined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="multiselect-container" ref={containerRef}>
      <span className="multiselect-label">{label}</span>
      <button
        type="button"
        className={`multiselect-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="multiselect-value">{displayText}</span>
        <ChevronDown size={14} className={`multiselect-chevron ${isOpen ? "rotate" : ""}`} />
      </button>

      {isOpen && (
        <div className="multiselect-popover">
          <div className="multiselect-header">
            <button
              type="button"
              className="multiselect-btn"
              onClick={handleSelectAll}
              disabled={isAllSelected}
            >
              すべて選択
            </button>
            <span className="multiselect-divider">|</span>
            <button
              type="button"
              className="multiselect-btn"
              onClick={handleClearAll}
              disabled={selectedCount === 0}
            >
              全解除
            </button>
          </div>
          <div className="multiselect-list">
            {items.map((item) => {
              const isChecked = selectedItems === undefined ? true : selectedItems.includes(item);
              return (
                <label
                  key={item}
                  className={`multiselect-item ${isChecked ? "checked" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggle(item);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    tabIndex={-1}
                  />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
