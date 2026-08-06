import { createContext } from "react";
import type { AppDependencies } from "@app/providers/app-dependencies";

export const AppDependenciesContext = createContext<AppDependencies | null>(null);
