import type { ProjectCreationErrorCode } from "@core/projects";

export type CreateCourseState =
  | { readonly status: "idle" }
  | { readonly status: "creating" }
  | { readonly status: "created" }
  | { readonly status: "error"; readonly code: ProjectCreationErrorCode };
