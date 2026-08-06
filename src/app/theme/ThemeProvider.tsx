import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { ThemeContext } from "@app/theme/theme-context";
import {
  getSystemTheme,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@app/theme/theme";
import type { WindowThemeGateway } from "@core/appearance";

interface ThemeProviderProps extends PropsWithChildren {
  readonly windowThemeGateway: WindowThemeGateway;
}

function readStoredPreference(): ThemePreference {
  try {
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({
  children,
  windowThemeGateway,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStoredPreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = resolveTheme(preference, systemTheme);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");
    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themePreference = preference;
    void windowThemeGateway.setTheme(resolvedTheme).catch(() => {
      // The web theme remains usable if native window synchronization fails.
    });
  }, [preference, resolvedTheme, windowThemeGateway]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
