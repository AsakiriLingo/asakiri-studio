import type { ContentCollectionSummary } from "@core/project-reading";

export type ProjectValidationReason = "unreadable" | "unknown";

export type WorkspaceOpenState =
  | { readonly status: "validating" }
  | { readonly status: "ready"; readonly collections: readonly ContentCollectionSummary[] }
  | { readonly status: "invalid"; readonly reason: ProjectValidationReason };
