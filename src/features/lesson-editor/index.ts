import { lazy } from "react";

export const PartEditor = lazy(() =>
  import("@features/lesson-editor/PartEditor").then((m) => ({ default: m.PartEditor })),
);
export type { PartEditorProps, SaveState } from "@features/lesson-editor/PartEditor";
export { courseToRichLibrary } from "@features/lesson-editor/rich-library";
