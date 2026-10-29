"use client";

import React from "react";
import { BarChart3, Layers, Swords } from "lucide-react";

export type MobileTab = "matchup" | "data" | "environments";

export type MobileNavProps = {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  lastUpdatedText?: string;
  showEnvironmentTab?: boolean;
};

export function MobileNav({
  activeTab,
  onTabChange,
  lastUpdatedText = "リアルタイム同期中",
  showEnvironmentTab = true,
}: MobileNavProps) {
  return (
    <nav className="mobile-bottom-nav">
      <div className="mobile-nav-items">
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === "matchup" ? "active" : ""}`}
          onClick={() => onTabChange("matchup")}
        >
          <Swords size={20} />
          <span>相性</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === "data" ? "active" : ""}`}
          onClick={() => onTabChange("data")}
        >
          <BarChart3 size={20} />
          <span>データ</span>
        </button>

        {showEnvironmentTab && (
          <button
            type="button"
            className={`mobile-nav-btn ${activeTab === "environments" ? "active" : ""}`}
            onClick={() => onTabChange("environments")}
          >
            <Layers size={20} />
            <span>環境管理</span>
          </button>
        )}
      </div>

      {lastUpdatedText && (
        <div className="mobile-nav-footer">
          <small>{lastUpdatedText}</small>
        </div>
      )}
    </nav>
  );
}
