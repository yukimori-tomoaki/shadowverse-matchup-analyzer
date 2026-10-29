"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, RefreshCw, RotateCcw, Upload, X } from "lucide-react";
import type { ClassKey } from "@/types/classIcon";
import { CLASS_METAS, CLASS_KEY_LIST } from "@/constants/classIcons";
import { ClassIcon } from "@/components/ClassIcon";
import { uploadClassIcon, resetClassIcon } from "@/lib/classIconStorage";

export type ClassIconManagerProps = {
  icons: Record<ClassKey, string>;
  onIconsChange: (next: Record<ClassKey, string>) => void;
  onClose: () => void;
};

export function ClassIconManager({ icons, onIconsChange, onClose }: ClassIconManagerProps) {
  const [selectedClass, setSelectedClass] = useState<ClassKey>("elf");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = (file?: File) => {
    if (!file) return;
    setStatus("idle");
    setMessage("");

    // Validate size
    if (file.size > 2 * 1024 * 1024) {
      setStatus("error");
      setMessage("ファイルサイズが上限（2MB）を超えています。");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setStatus("uploading");
    setMessage("");

    try {
      const url = await uploadClassIcon(selectedClass, selectedFile);
      const next = { ...icons, [selectedClass]: url };
      onIconsChange(next);
      setStatus("success");
      setMessage(`${CLASS_METAS[selectedClass].name}のアイコンを更新しました。`);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "アップロードに失敗しました。");
    }
  };

  const handleReset = async (classKey: ClassKey) => {
    if (!window.confirm(`${CLASS_METAS[classKey].name}のアイコンをデフォルトに戻しますか？`)) {
      return;
    }
    setStatus("uploading");
    try {
      await resetClassIcon(classKey);
      const next = { ...icons };
      delete next[classKey];
      onIconsChange(next);
      if (selectedClass === classKey) {
        setPreviewUrl(null);
        setSelectedFile(null);
      }
      setStatus("success");
      setMessage(`${CLASS_METAS[classKey].name}のアイコンをデフォルトに戻しました。`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "リセットに失敗しました。");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card class-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">CLASS ICON MANAGEMENT</span>
            <h2>クラス画像管理</h2>
          </div>
          <button className="icon-button close-button" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>

        <p className="modal-subtitle">
          Shadowverseの各クラスアイコン画像をアップロード・変更できます。登録した画像は相性表や対戦履歴に共通して反映されます。
        </p>

        {message && (
          <div className={`notice ${status === "error" ? "error" : "success"}`} style={{ margin: "12px 0" }}>
            <span>{message}</span>
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <div className="class-grid-selector">
          {CLASS_KEY_LIST.map((key) => {
            const meta = CLASS_METAS[key];
            const hasCustom = Boolean(icons[key]);
            const isSelected = selectedClass === key;

            return (
              <button
                key={key}
                type="button"
                className={`class-card-btn ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setSelectedClass(key);
                  setPreviewUrl(null);
                  setSelectedFile(null);
                  setStatus("idle");
                  setMessage("");
                }}
              >
                <ClassIcon classKey={key} customUrl={icons[key]} size={36} showBadge />
                <div className="class-card-text">
                  <strong>{meta.name}</strong>
                  <small>{hasCustom ? "カスタム画像" : "デフォルト"}</small>
                </div>
                {hasCustom && <span className="custom-indicator" title="カスタム登録済み" />}
              </button>
            );
          })}
        </div>

        {/* Selected class details and upload zone */}
        <div className="class-edit-area">
          <div className="class-edit-header">
            <h3>{CLASS_METAS[selectedClass].name} のアイコン設定</h3>
            {icons[selectedClass] && (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => void handleReset(selectedClass)}
                disabled={status === "uploading"}
                title="デフォルト画像に戻す"
              >
                <RotateCcw size={14} /> デフォルトに戻す
              </button>
            )}
          </div>

          <div className="class-preview-row">
            <div className="preview-box">
              <span className="preview-label">現在の表示</span>
              <div className="preview-avatar-wrapper">
                <ClassIcon
                  classKey={selectedClass}
                  customUrl={icons[selectedClass]}
                  size={56}
                  showBadge
                />
              </div>
            </div>

            {previewUrl && (
              <div className="preview-box preview-new">
                <span className="preview-label">アップロード予定</span>
                <div className="preview-avatar-wrapper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="アップロードプレビュー"
                    style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
                  />
                </div>
              </div>
            )}

            <div className="upload-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => handleSelectFile(e.target.files?.[0])}
              />

              <button
                type="button"
                className="button button-ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={status === "uploading"}
              >
                <ImagePlus size={16} /> 画像を選択
              </button>

              {selectedFile && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void handleUpload()}
                  disabled={status === "uploading"}
                >
                  {status === "uploading" ? (
                    <>
                      <RefreshCw size={15} className="spin" /> 保存中...
                    </>
                  ) : (
                    <>
                      <Upload size={15} /> この画像で保存
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <small className="muted" style={{ display: "block", marginTop: 8 }}>
            ※ 対応形式: PNG, JPEG, WebP, SVG (上限2MB)。自動で正円にクロップされます。
          </small>
        </div>
      </div>
    </div>
  );
}
