"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

interface A11yContextValue {
  a11y: boolean;
  theme: Theme;
  toggleA11y: () => void;
  toggleTheme: () => void;
}

const A11yContext = createContext<A11yContextValue>({
  a11y: false,
  theme: "light",
  toggleA11y: () => {},
  toggleTheme: () => {},
});

export function useA11y() {
  return useContext(A11yContext);
}

export default function A11yProvider({ children }: { children: React.ReactNode }) {
  const [a11y, setA11y] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      setA11y(localStorage.getItem("cwm-a11y") === "true");
      // A stored choice wins; otherwise follow the system, defaulting to Daylight.
      const stored = localStorage.getItem("cwm-theme-v2");
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setTheme(stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light");
    } catch {
      // localStorage unavailable — stay at defaults
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.a11y = a11y ? "true" : "false";
    try { localStorage.setItem("cwm-a11y", String(a11y)); } catch {}
  }, [a11y]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleA11y = useCallback(() => setA11y((v) => !v), []);
  // Only an explicit choice is remembered; otherwise the system preference applies.
  const toggleTheme = useCallback(() => setTheme((v) => {
    const next = v === "dark" ? "light" : "dark";
    try { localStorage.setItem("cwm-theme-v2", next); } catch {}
    return next;
  }), []);

  return (
    <A11yContext.Provider value={{ a11y, theme, toggleA11y, toggleTheme }}>
      {children}
    </A11yContext.Provider>
  );
}
