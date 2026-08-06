export type RuntimeKind = "browser" | "tauri";

export function getRuntimeKind(): RuntimeKind {
  return "__TAURI_INTERNALS__" in window ? "tauri" : "browser";
}
