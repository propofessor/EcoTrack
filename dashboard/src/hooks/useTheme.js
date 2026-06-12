// src/hooks/useTheme.js
import { useState, useEffect } from "react";

export function useTheme() {
  const getInitialTheme = () => {
    // RF4: Prima controlla il cookie/localStorage
    const saved = localStorage.getItem("ecotrack-theme");
    if (saved) return saved;
    // RF4: Fallback al tema di sistema
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    // Applica il tema al <html> così le CSS variables diventano attive
    document.documentElement.setAttribute("data-theme", theme);
    // RF4: Persistenza nel localStorage (si può usare anche un cookie)
    localStorage.setItem("ecotrack-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}
