"use client";

import React, { useState } from "react";
import { Calendar, ChevronDown, Check, Layers } from "lucide-react";
import type { MatchupEnvironment } from "@/types/environment";

export type EnvironmentSelectorProps = {
  environments: MatchupEnvironment[];
  selectedEnvironmentId: string | "all";
  onSelectEnvironment: (id: string | "all") => void;
  onOpenManager?: () => void;
};

export function EnvironmentSelector({
  environments,
  selectedEnvironmentId,
  onSelectEnvironment,
  onOpenManager,
}: EnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedEnv =
    selectedEnvironmentId === "all"
      ? null
      : environments.find((e) => e.id === selectedEnvironmentId);

  const displayText = selectedEnv
    ? `${selectedEnv.name}`
    : "全期間データ";

  const dateSubtext = selectedEnv
    ? `${selectedEnv.startDate.slice(5).replace("-", "/")}〜${selectedEnv.endDate ? selectedEnv.endDate.slice(5).replace("-", "/") : ""}`
    : "すべての期間";

  return (
    <div className="env-selector-wrapper">
      <div className="env-selector-pill" onClick={() => setIsOpen(!isOpen)}>
        <Calendar size={15} className="env-icon" />
        <div className="env-selector-text">
          <span className="env-name">{displayText}</span>
          <span className="env-date-tag">{dateSubtext}</span>
        </div>
        <ChevronDown size={14} className={`env-chevron ${isOpen ? "open" : ""}`} />
      </div>

      {onOpenManager && (
        <button
          type="button"
          className="env-manage-btn"
          onClick={onOpenManager}
          title="環境管理を開く"
        >
          <Layers size={14} />
          <span>環境設定</span>
        </button>
      )}

      {isOpen && (
        <>
          <div className="env-dropdown-backdrop" onClick={() => setIsOpen(false)} />
          <div className="env-dropdown-menu">
            <div className="env-dropdown-header">ゲーム環境を選択</div>
            <button
              type="button"
              className={`env-dropdown-item ${selectedEnvironmentId === "all" ? "active" : ""}`}
              onClick={() => {
                onSelectEnvironment("all");
                setIsOpen(false);
              }}
            >
              <div className="env-item-info">
                <strong>全期間</strong>
                <small>過去すべての対戦データを集計</small>
              </div>
              {selectedEnvironmentId === "all" && <Check size={14} />}
            </button>

            {environments.map((env) => {
              const isSelected = selectedEnvironmentId === env.id;
              const dateRange = `${env.startDate} 〜 ${env.endDate ?? "現在"}`;
              return (
                <button
                  key={env.id}
                  type="button"
                  className={`env-dropdown-item ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    onSelectEnvironment(env.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="env-item-info">
                    <div className="env-item-title-row">
                      <strong>{env.name}</strong>
                      {env.isDefault && <span className="default-pill">最新</span>}
                    </div>
                    <small>{dateRange}</small>
                  </div>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
