"use client";

import React from "react";
import { BarChart3, Clock, Layers, Swords } from "lucide-react";

export type MobileTab = "matchup" | "history" | "data" | "environments";

export type MobileNavProps = {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  lastUpdatedText?: string;
  showEnvironmentTab?: boolean;
};

export function MobileNav({
  activeTab,
  onTabChange,
  lastUpdatedText = "最終更新 17:42",
  showEnvironmentTab = true,
}: MobileNavProps) {
  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-nav-items">
        {showEnvironmentTab && (
          <button
            type="button"
            className={`mobile-nav-btn ${activeTab === "environments" ? "active" : ""}`}
            onClick={() => onTabChange("environments")}
          >
            <Layers size={18} />
            <span>環境管理</span>
          </button>
        )}

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === "matchup" ? "active" : ""}`}
          onClick={() => onTabChange("matchup")}
        >
          <Swords size={18} />
          <span>相性</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => onTabChange("history")}
        >
          <Clock size={18} />
          <span>対戦履歴</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === "data" ? "active" : ""}`}
          onClick={() => onTabChange("data")}
        >
          <BarChart3 size={18} />
          <span>データ</span>
        </button>
      </div>

      {lastUpdatedText && (
        <div className="mobile-nav-footer">
          <small>{lastUpdatedText}</small>
        </div>
      )}
    </nav>
  );
}
