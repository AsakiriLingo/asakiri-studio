import { useContext } from "react";
import { AppDependenciesContext } from "@app/providers/app-dependencies-context";

export function useAppDependencies() {
  const dependencies = useContext(AppDependenciesContext);

  if (!dependencies) {
    throw new Error("useAppDependencies must be used inside AppProviders.");
  }

  return dependencies;
}
