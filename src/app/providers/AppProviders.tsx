import { createContext, type PropsWithChildren } from "react";
import type { AppDependencies } from "@app/providers/app-dependencies";
import { LocalizationProvider } from "@app/localization/LocalizationProvider";
import { ThemeProvider } from "@app/theme/ThemeProvider";

export const AppDependenciesContext = createContext<AppDependencies | null>(null);

interface AppProvidersProps extends PropsWithChildren {
  readonly dependencies: AppDependencies;
}

export function AppProviders({ children, dependencies }: AppProvidersProps) {
  return (
    <ThemeProvider windowThemeGateway={dependencies.windowThemeGateway}>
      <LocalizationProvider>
        <AppDependenciesContext.Provider value={dependencies}>
          {children}
        </AppDependenciesContext.Provider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
