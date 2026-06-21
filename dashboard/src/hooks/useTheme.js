import { useState, useEffect } from "react";

export function useTheme() {
  const getInitialTheme = () => {

    const saved = localStorage.getItem("ecotrack-theme");
    if (saved) return saved;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {

    document.documentElement.setAttribute("data-theme", theme);

    localStorage.setItem("ecotrack-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}
