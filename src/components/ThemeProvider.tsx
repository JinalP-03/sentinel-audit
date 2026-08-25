"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type ThemeCtx = { dark: boolean; toggle: () => void };

const ThemeContext = createContext<ThemeCtx>({ dark: false, toggle: () => {} });

// ---------------------------------------------------------------------------
// Provider — lives in the root layout so it persists across all navigations
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise from localStorage so the first render matches the stored pref.
  // Falls back to false (light) when localStorage is unavailable (SSR/bots).
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

  // Keep <html class="dark"> and localStorage in sync whenever dark changes.
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // localStorage blocked (private browsing / sandboxed) — ignore
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext);
}
