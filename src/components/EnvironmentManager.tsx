"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { MatchupEnvironment, EnvironmentInput } from "@/types/environment";
import {
  saveEnvironment,
  deleteEnvironment,
  setDefaultEnvironment,
} from "@/lib/environmentStorage";

export type EnvironmentManagerProps = {
  environments: MatchupEnvironment[];
  onEnvironmentsChange: (next: MatchupEnvironment[]) => void;
  onClose: () => void;
};

export function EnvironmentManager({
  environments,
  onEnvironmentsChange,
  onClose,
}: EnvironmentManagerProps) {
  const [editingEnv, setEditingEnv] = useState<EnvironmentInput | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const currentEnv = environments.find((e) => e.isDefault);
  const pastEnvs = environments.filter((e) => !e.isDefault);

  const handleStartAdd = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingEnv({
      name: "",
      startDate: today,
      endDate: null,
      isDefault: environments.length === 0,
    });
    setIsNew(true);
    setError("");
  };

  const handleStartEdit = (env: MatchupEnvironment) => {
    setEditingEnv({
      id: env.id,
      name: env.name,
      startDate: env.startDate,
      endDate: env.endDate,
      isDefault: env.isDefault,
    });
    setIsNew(false);
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnv) return;

    if (!editingEnv.name.trim()) {
      setError("環境名を入力してください。");
      return;
    }
    if (!editingEnv.startDate) {
      setError("開始日を入力してください。");
      return;
    }
    if (editingEnv.endDate && editingEnv.startDate > editingEnv.endDate) {
      setError("開始日は終了日以前の日付を指定してください。");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const saved = await saveEnvironment(editingEnv);

      let nextList: MatchupEnvironment[];
      if (isNew) {
        nextList = [saved, ...environments.filter((e) => e.id !== saved.id)];
      } else {
        nextList = environments.map((e) => (e.id === saved.id ? saved : e));
      }
      if (saved.isDefault) {
        nextList = nextList.map((e) => ({ ...e, isDefault: e.id === saved.id }));
      }
      onEnvironmentsChange(nextList);
      setEditingEnv(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除してもよろしいですか？\n※ 過去の対戦戦績データ自体は削除されません。`)) {
      return;
    }
    try {
      await deleteEnvironment(id);
      const next = environments.filter((e) => e.id !== id);
      onEnvironmentsChange(next);
      if (editingEnv?.id === id) setEditingEnv(null);
    } catch {
      alert("削除に失敗しました。");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultEnvironment(id);
      const next = environments.map((e) => ({ ...e, isDefault: e.id === id }));
      onEnvironmentsChange(next);
    } catch {
      alert("最新環境の設定に失敗しました。");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card env-manager-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">ENVIRONMENT CONFIGURATION</span>
            <h2>環境管理</h2>
            <p className="modal-subtitle" style={{ margin: "4px 0 0" }}>
              環境ごとに対戦データを集計できます
            </p>
          </div>
          <button className="icon-button close-button" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        {/* Add Environment Button */}
        <button
          type="button"
          className="button button-primary env-add-btn"
          onClick={handleStartAdd}
        >
          <Plus size={16} /> 環境を追加
        </button>

        {/* Edit Modal / Form overlay */}
        {editingEnv && (
          <form className="env-edit-form" onSubmit={handleSave}>
            <div className="env-edit-header">
              <h4>{isNew ? "新しい環境を追加" : "環境の編集"}</h4>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditingEnv(null)}
                aria-label="編集キャンセル"
              >
                <X size={16} />
              </button>
            </div>

            {error && <div className="notice error">{error}</div>}

            <label>
              環境名
              <input
                type="text"
                placeholder="例: 新環境 (10/28〜)"
                value={editingEnv.name}
                onChange={(e) => setEditingEnv({ ...editingEnv, name: e.target.value })}
                required
              />
            </label>

            <div className="env-date-row">
              <label>
                開始日
                <input
                  type="date"
                  value={editingEnv.startDate}
                  onChange={(e) => setEditingEnv({ ...editingEnv, startDate: e.target.value })}
                  required
                />
              </label>
              <label>
                終了日 (任意)
                <input
                  type="date"
                  value={editingEnv.endDate ?? ""}
                  onChange={(e) =>
                    setEditingEnv({
                      ...editingEnv,
                      endDate: e.target.value ? e.target.value : null,
                    })
                  }
                />
                <small className="muted">未設定の場合は「現在まで」集計されます</small>
              </label>
            </div>

            <label className="checkbox-field" style={{ padding: "6px 0" }}>
              <input
                type="checkbox"
                checked={editingEnv.isDefault}
                onChange={(e) => setEditingEnv({ ...editingEnv, isDefault: e.target.checked })}
              />
              <span>現在の環境として指定（初期表示されます）</span>
            </label>

            <div className="env-form-actions">
              {!isNew && editingEnv.id && (
                <button
                  type="button"
                  className="button button-ghost danger-btn"
                  onClick={() => handleDelete(editingEnv.id!, editingEnv.name)}
                >
                  <Trash2 size={14} /> 削除
                </button>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setEditingEnv(null)}
                >
                  キャンセル
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Environment Cards List */}
        <div className="env-list-container">
          {currentEnv && (
            <div className="env-card env-card-current">
              <div className="env-card-top">
                <div className="env-card-status">
                  <span className="current-dot" />
                  <span className="env-section-title">現在の環境</span>
                </div>
                <span className="env-badge-counting">集計中</span>
              </div>

              <div className="env-card-main">
                <h3 className="env-title">{currentEnv.name}</h3>
                <div className="env-meta-dates">
                  <div className="env-date-item">
                    <Calendar size={13} />
                    <span>開始日</span>
                    <strong>{currentEnv.startDate.replace(/-/g, "/")}</strong>
                  </div>
                  <div className="env-date-item">
                    <Calendar size={13} />
                    <span>終了日</span>
                    <strong>
                      {currentEnv.endDate
                        ? currentEnv.endDate.replace(/-/g, "/")
                        : "終了日未設定"}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="env-card-edit-btn"
                  onClick={() => handleStartEdit(currentEnv)}
                >
                  <Edit3 size={14} />
                  <span>編集</span>
                </button>
              </div>
            </div>
          )}

          {pastEnvs.length > 0 && (
            <div className="past-envs-section">
              <div className="past-section-header">
                <Clock size={14} />
                <span>過去の環境</span>
              </div>

              {pastEnvs.map((env) => (
                <div key={env.id} className="env-card env-card-past">
                  <div className="env-card-top">
                    <h3 className="env-title">{env.name}</h3>
                    <span className="env-badge-past">過去環境</span>
                  </div>

                  <div className="env-card-main">
                    <div className="env-meta-dates">
                      <div className="env-date-item">
                        <Calendar size={13} />
                        <span>開始日</span>
                        <strong>{env.startDate.replace(/-/g, "/")}</strong>
                      </div>
                      <div className="env-date-item">
                        <Calendar size={13} />
                        <span>終了日</span>
                        <strong>
                          {env.endDate
                            ? env.endDate.replace(/-/g, "/")
                            : "終了日未設定"}
                        </strong>
                      </div>
                    </div>

                    <div className="env-card-action-row">
                      <button
                        type="button"
                        className="button button-ghost mini-btn"
                        onClick={() => handleSetDefault(env.id)}
                        title="この環境を現在環境に設定"
                      >
                        <CheckCircle2 size={12} /> 最新環境に設定
                      </button>
                      <button
                        type="button"
                        className="env-card-edit-btn"
                        onClick={() => handleStartEdit(env)}
                      >
                        <Edit3 size={14} />
                        <span>編集</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Explanatory Footer Note */}
        <div className="env-footer-note">
          <Info size={16} />
          <span>
            対戦日から自動で環境を振り分けます。環境を切り替えても過去データはそのまま保持されます。
          </span>
        </div>
      </div>
    </div>
  );
}
