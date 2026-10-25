import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeCtx = createContext(null);

const STORAGE_KEY = "cultora_admin_theme";

function detectInitial() {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AdminThemeProvider({ children }) {
  const [theme, setTheme] = useState(detectInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    const el = document.documentElement;
    el.setAttribute("data-admin-theme", theme);
    // Return cleanup: when component unmounts (user leaves admin), remove marker
    return () => {
      // If the current theme attribute still matches ours, remove it
      if (el.getAttribute("data-admin-theme") === theme) {
        el.removeAttribute("data-admin-theme");
      }
    };
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>
  );
}

export const useAdminTheme = () => useContext(ThemeCtx);
