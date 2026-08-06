import { createContext, type PropsWithChildren } from "react";
import type { AppDependencies } from "@app/providers/app-dependencies";

export const AppDependenciesContext = createContext<AppDependencies | null>(null);

interface AppProvidersProps extends PropsWithChildren {
  readonly dependencies: AppDependencies;
}

export function AppProviders({ children, dependencies }: AppProvidersProps) {
  return (
    <AppDependenciesContext.Provider value={dependencies}>
      {children}
    </AppDependenciesContext.Provider>
  );
}
