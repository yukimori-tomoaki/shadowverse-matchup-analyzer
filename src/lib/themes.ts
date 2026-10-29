import type { ThemeId, ThemePreset } from "@/types/theme";

export const THEME_STORAGE_KEY = "sv_theme_preset";
export const DEFAULT_THEME: ThemeId = "dark";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "dark",
    name: "ダーク",
    description: "濃紺背景とシアンアクセント。洗練された標準テーマ。",
    previewColors: {
      bg: "#080d15",
      panel: "#101a28",
      accent: "#50d9ef",
      text: "#e7f0f7",
    },
  },
  {
    id: "white",
    name: "ホワイト",
    description: "白・ライトグレー背景とブルー。明るく視認性の高いデザイン。",
    previewColors: {
      bg: "#f4f6fa",
      panel: "#ffffff",
      accent: "#0284c7",
      text: "#0f172a",
    },
  },
  {
    id: "cyber",
    name: "サイバー",
    description: "深い黒とネオンシアン。近未来感あふれるハイテクデザイン。",
    previewColors: {
      bg: "#030712",
      panel: "#09101f",
      accent: "#00ffcc",
      text: "#f8fafc",
    },
  },
  {
    id: "mystic",
    name: "ミスティック",
    description: "暗い紫とラベンダーアクセント。幻想的で落ち着いたデザイン。",
    previewColors: {
      bg: "#0c0a17",
      panel: "#17122b",
      accent: "#c084fc",
      text: "#f5f3ff",
    },
  },
];

export function applyTheme(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error("Failed to persist theme to localStorage:", e);
  }
}

export function getSavedTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (saved && (saved === "dark" || saved === "white" || saved === "cyber" || saved === "mystic")) {
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_THEME;
}
