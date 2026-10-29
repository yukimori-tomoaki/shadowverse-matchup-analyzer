export type ThemeId = "dark" | "white" | "cyber" | "mystic";

export type ThemePreset = {
  id: ThemeId;
  name: string;
  description: string;
  previewColors: {
    bg: string;
    panel: string;
    accent: string;
    text: string;
  };
};
