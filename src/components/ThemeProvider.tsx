"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type ThemePreference = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const ThemeContext = createContext<{ preference: ThemePreference; resolved: Resolved; setPreference: (value: ThemePreference) => void; toggle: () => void } | null>(null);

function readSystem(): Resolved {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ initialPreference, children }: { initialPreference: ThemePreference; children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [system, setSystem] = useState<Resolved>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSystem(readSystem());
    setMounted(true);
    const stored = localStorage.getItem("feeshield-theme") as ThemePreference | null;
    if (stored === "light" || stored === "dark" || stored === "system") setPreferenceState(stored);
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved: Resolved = preference === "system" ? (mounted ? system : initialPreference === "dark" ? "dark" : "light") : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved, mounted]);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    try { localStorage.setItem("feeshield-theme", value); } catch { /* storage unavailable: keep in-memory preference */ }
  }, []);

  const toggle = useCallback(() => setPreference(resolved === "dark" ? "light" : "dark"), [resolved, setPreference]);
  const value = useMemo(() => ({ preference, resolved, setPreference, toggle }), [preference, resolved, setPreference, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

/** Compact light/dark switch for the navigation header. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`theme-switch ${className}`}
    >
      <span className="knob" aria-hidden="true" />
      <span className="slot" aria-hidden="true"><Sun size={14} strokeWidth={2.2} /></span>
      <span className="slot" aria-hidden="true"><Moon size={14} strokeWidth={2.2} /></span>
    </button>
  );
}

/** Full preference selector used on the settings screen. */
export function ThemePreferenceControl() {
  const { preference, setPreference } = useTheme();
  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex rounded-[12px] border border-line bg-surface-2 p-1">
      {options.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button key={value} type="button" role="radio" aria-checked={active} onClick={() => setPreference(value)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-[9px] px-3.5 text-[11px] font-bold transition-all duration-200 ${active ? "bg-surface text-brand-ink shadow-[var(--shadow-sm)]" : "text-muted hover:text-ink"}`}>
            <Icon size={14} />{label}
          </button>
        );
      })}
    </div>
  );
}
