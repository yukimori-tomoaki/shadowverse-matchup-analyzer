"use client";

import { useEffect, useState } from "react";
import type { ThemeId } from "@/types/theme";
import { applyTheme, getSavedTheme } from "@/lib/themes";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => getSavedTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: ThemeId) => {
    setThemeState(next);
    applyTheme(next);
  };

  return { theme, setTheme };
}
