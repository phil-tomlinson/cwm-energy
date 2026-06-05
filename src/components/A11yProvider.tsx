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
  theme: "dark",
  toggleA11y: () => {},
  toggleTheme: () => {},
});

export function useA11y() {
  return useContext(A11yContext);
}

export default function A11yProvider({ children }: { children: React.ReactNode }) {
  const [a11y, setA11y] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      setA11y(localStorage.getItem("cwm-a11y") === "true");
      setTheme(localStorage.getItem("cwm-theme") === "light" ? "light" : "dark");
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
    try { localStorage.setItem("cwm-theme", theme); } catch {}
  }, [theme]);

  const toggleA11y = useCallback(() => setA11y((v) => !v), []);
  const toggleTheme = useCallback(() => setTheme((v) => v === "dark" ? "light" : "dark"), []);

  return (
    <A11yContext.Provider value={{ a11y, theme, toggleA11y, toggleTheme }}>
      {children}
    </A11yContext.Provider>
  );
}
