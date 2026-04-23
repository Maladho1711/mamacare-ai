'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

// --- Types --------------------------------------------------------------------

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isDark: boolean;
}

// --- Constante ----------------------------------------------------------------

const STORAGE_KEY = 'mamacare-theme';

// --- Script anti-flash (injecté dans <head> côté serveur) ---------------------
// Ce script s'exécute avant le premier paint et applique la classe dark immédiatement.

export const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = (stored === 'dark' || stored === 'light' || stored === 'system') ? stored : 'system';
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {}
})();
`.trim();

// --- Contexte ----------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => undefined,
  isDark: false,
});

// --- Provider ----------------------------------------------------------------

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);

  // Résoudre si dark selon theme + préférence système
  const resolveIsDark = useCallback((t: Theme): boolean => {
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  // Appliquer la classe sur <html>
  const applyTheme = useCallback(
    (t: Theme) => {
      const dark = resolveIsDark(t);
      setIsDark(dark);
      if (dark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    [resolveIsDark],
  );

  // Initialisation depuis localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      const initial: Theme =
        stored === 'dark' || stored === 'light' || stored === 'system'
          ? stored
          : 'system';
      setThemeState(initial);
      applyTheme(initial);
    } catch {
      applyTheme('system');
    }
  }, [applyTheme]);

  // Écouter les changements système quand theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch { /* storage plein */ }
      applyTheme(t);
    },
    [applyTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// --- Hook ---------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
