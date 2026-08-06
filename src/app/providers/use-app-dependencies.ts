import { useContext } from "react";
import { AppDependenciesContext } from "@app/providers/AppProviders";

export function useAppDependencies() {
  const dependencies = useContext(AppDependenciesContext);

  if (!dependencies) {
    throw new Error("useAppDependencies must be used inside AppProviders.");
  }

  return dependencies;
}
