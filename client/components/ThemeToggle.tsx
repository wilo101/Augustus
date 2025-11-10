import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme") || "dark";
    setTheme(stored);
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = theme === "dark" ? "light" : "dark";
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md border border-red-900/30 bg-black/40 px-3 py-1.5 text-sm text-red-100 hover:bg-black/60 transition-colors"
      aria-label="Toggle theme"
    >
      <span className="i-theme h-2 w-2 rounded-full bg-primary" />
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
