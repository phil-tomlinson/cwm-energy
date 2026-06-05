"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface A11yContextValue {
  a11y: boolean;
  toggle: () => void;
}

const A11yContext = createContext<A11yContextValue>({ a11y: false, toggle: () => {} });

export function useA11y() {
  return useContext(A11yContext);
}

export default function A11yProvider({ children }: { children: React.ReactNode }) {
  const [a11y, setA11y] = useState(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      setA11y(localStorage.getItem("cwm-a11y") === "true");
    } catch {
      // localStorage unavailable (private browsing, etc.) — stay at default
    }
  }, []);

  // Sync state → DOM attribute + localStorage
  useEffect(() => {
    document.documentElement.dataset.a11y = a11y ? "true" : "false";
    try {
      localStorage.setItem("cwm-a11y", String(a11y));
    } catch {
      // ignore
    }
  }, [a11y]);

  const toggle = useCallback(() => setA11y((v) => !v), []);

  return (
    <A11yContext.Provider value={{ a11y, toggle }}>
      {children}
    </A11yContext.Provider>
  );
}
