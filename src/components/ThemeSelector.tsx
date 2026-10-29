"use client";

import React from "react";
import { Check, Palette, X } from "lucide-react";
import type { ThemeId } from "@/types/theme";
import { THEME_PRESETS } from "@/lib/themes";

export type ThemeSelectorProps = {
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  onClose?: () => void;
  embedded?: boolean;
};

export function ThemeSelector({
  currentTheme,
  onSelectTheme,
  onClose,
  embedded = false,
}: ThemeSelectorProps) {
  const content = (
    <div className={`theme-selector-container ${embedded ? "embedded" : ""}`}>
      <div className="section-heading compact">
        <div>
          <span className="eyebrow"><Palette size={14} /> THEME PRESETS</span>
          <h2>テーマ設定</h2>
        </div>
        {onClose && (
          <button className="icon-button close-button" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        )}
      </div>

      <p className="theme-subtitle">
        アプリ全体の配色を切り替えます。選択したテーマは自動でブラウザに保存されます。
      </p>

      <div className="theme-card-grid">
        {THEME_PRESETS.map((preset) => {
          const isSelected = currentTheme === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`theme-card ${isSelected ? "active" : ""}`}
              onClick={() => onSelectTheme(preset.id)}
            >
              <div className="theme-card-header">
                <span className="theme-card-title">{preset.name}</span>
                {isSelected && (
                  <span className="theme-active-badge">
                    <Check size={12} /> 適用中
                  </span>
                )}
              </div>

              <div
                className="theme-palette-preview"
                style={{ backgroundColor: preset.previewColors.bg }}
              >
                <div
                  className="palette-swatch panel"
                  style={{ backgroundColor: preset.previewColors.panel, borderColor: preset.previewColors.accent }}
                >
                  <span
                    className="palette-swatch-text"
                    style={{ color: preset.previewColors.text }}
                  >
                    Aa
                  </span>
                  <span
                    className="palette-swatch-accent"
                    style={{ backgroundColor: preset.previewColors.accent }}
                  />
                </div>
              </div>

              <p className="theme-card-desc">{preset.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
