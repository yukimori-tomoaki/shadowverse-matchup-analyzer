import type { ClassKey } from "@/types/classIcon";

export type ClassMeta = {
  key: ClassKey;
  name: string;
  enName: string;
  themeColor: string;
  badgeBg: string;
  borderColor: string;
};

export const CLASS_METAS: Record<ClassKey, ClassMeta> = {
  elf: {
    key: "elf",
    name: "エルフ",
    enName: "Forestcraft",
    themeColor: "#22c55e",
    badgeBg: "rgba(34, 197, 94, 0.12)",
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  royal: {
    key: "royal",
    name: "ロイヤル",
    enName: "Swordcraft",
    themeColor: "#eab308",
    badgeBg: "rgba(234, 179, 8, 0.12)",
    borderColor: "rgba(234, 179, 8, 0.4)",
  },
  witch: {
    key: "witch",
    name: "ウィッチ",
    enName: "Runecraft",
    themeColor: "#818cf8",
    badgeBg: "rgba(129, 140, 248, 0.12)",
    borderColor: "rgba(129, 140, 248, 0.4)",
  },
  dragon: {
    key: "dragon",
    name: "ドラゴン",
    enName: "Dragoncraft",
    themeColor: "#ef4444",
    badgeBg: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  nightmare: {
    key: "nightmare",
    name: "ナイトメア",
    enName: "Abysscraft",
    themeColor: "#a855f7",
    badgeBg: "rgba(168, 85, 247, 0.12)",
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  bishop: {
    key: "bishop",
    name: "ビショップ",
    enName: "Havencraft",
    themeColor: "#facc15",
    badgeBg: "rgba(250, 204, 21, 0.12)",
    borderColor: "rgba(250, 204, 21, 0.4)",
  },
  nemesis: {
    key: "nemesis",
    name: "ネメシス",
    enName: "Portalcraft",
    themeColor: "#06b6d4",
    badgeBg: "rgba(6, 182, 212, 0.12)",
    borderColor: "rgba(6, 182, 212, 0.4)",
  },
};

export const CLASS_KEY_LIST: ClassKey[] = [
  "elf",
  "royal",
  "witch",
  "dragon",
  "nightmare",
  "bishop",
  "nemesis",
];

const NAME_TO_KEY: Record<string, ClassKey> = {
  "エルフ": "elf",
  "ロイヤル": "royal",
  "ウィッチ": "witch",
  "ドラゴン": "dragon",
  "ナイトメア": "nightmare",
  "ビショップ": "bishop",
  "ネメシス": "nemesis",
};

export function getClassKeyFromName(className: string): ClassKey | null {
  const trimmed = className.trim();
  if (NAME_TO_KEY[trimmed]) return NAME_TO_KEY[trimmed];
  for (const [name, key] of Object.entries(NAME_TO_KEY)) {
    if (trimmed.includes(name)) return key;
  }
  return null;
}

export function getDeckClassKey(deckName: string): ClassKey | null {
  const trimmed = deckName.trim();
  for (const [name, key] of Object.entries(NAME_TO_KEY)) {
    if (trimmed.endsWith(name) || trimmed.includes(name)) return key;
  }
  return null;
}
