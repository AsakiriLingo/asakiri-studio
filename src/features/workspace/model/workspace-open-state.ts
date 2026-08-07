export type ProjectValidationReason = "unreadable" | "unknown";

export type WorkspaceOpenState =
  | { readonly status: "validating" }
  | { readonly status: "ready" }
  | { readonly status: "invalid"; readonly reason: ProjectValidationReason };
