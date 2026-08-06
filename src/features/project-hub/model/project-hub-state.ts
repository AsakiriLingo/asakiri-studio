import type { ProjectDirectory } from "@shared/contracts/project-directory";

export type ProjectHubState =
  | { readonly status: "idle" }
  | { readonly status: "opening" }
  | { readonly status: "opened"; readonly project: ProjectDirectory }
  | { readonly status: "error"; readonly message: string };
