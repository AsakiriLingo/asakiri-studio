import { lazy } from "react";

export const DraftsPanel = lazy(() =>
  import("@features/drafts/DraftsPanel").then((m) => ({ default: m.DraftsPanel })),
);
export type { DraftsPanelProps } from "@features/drafts/DraftsPanel";
export { DraftsToolbar } from "@features/drafts/DraftsToolbar";
export type { DraftsToolbarProps, DraftUploadProgress } from "@features/drafts/DraftsToolbar";
export { DraftsSearch } from "@features/drafts/DraftsSearch";
export type { DraftsSearchProps } from "@features/drafts/DraftsSearch";
