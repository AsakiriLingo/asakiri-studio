import type { PropsWithChildren } from "react";
import type { AppDependencies } from "@app/providers/app-dependencies";
import { AppDependenciesContext } from "@app/providers/app-dependencies-context";
import { LocalizationProvider } from "@app/localization/LocalizationProvider";
import { ThemeProvider } from "@app/theme/ThemeProvider";

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
