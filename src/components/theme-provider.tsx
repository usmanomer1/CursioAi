"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const STORAGE_KEY = "jobotic-theme";

interface ThemeContextValue {
  theme: Theme;
  resolved: Resolved;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "dark",
  setTheme: () => {},
});

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* private mode */
  }
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme; // CSS falls back to prefers-color-scheme
  } else {
    root.dataset.theme = theme;
  }
}

/** Subscribe to OS colour-scheme changes (external store). */
function subscribeToSystem(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSystemSnapshot = (): Resolved =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

// Server render assumes dark; the inline no-flash script sets the real value
// before paint, and hydration reconciles via useSyncExternalStore.
const getSystemServerSnapshot = (): Resolved => "dark";

/**
 * Inline no-flash script — rendered before the app paints so the stored
 * theme applies immediately. Mirrors applyTheme() above.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer runs on the client during the first render only.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "system" : readStoredTheme()
  );

  const systemResolved = useSyncExternalStore(
    subscribeToSystem,
    getSystemSnapshot,
    getSystemServerSnapshot
  );

  const resolved: Resolved = theme === "system" ? systemResolved : theme;

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
