import type { ProjectDirectory } from "@core/projects";

export type ProjectHubState =
  | { readonly status: "idle" }
  | { readonly status: "opening" }
  | { readonly status: "opened"; readonly project: ProjectDirectory }
  | { readonly status: "error"; readonly message: string };
