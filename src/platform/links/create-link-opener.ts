import type { LinkOpener } from "@core/links";
import { TauriLinkOpener } from "@platform/links/tauri-link-opener";

export function createLinkOpener(): LinkOpener {
  return new TauriLinkOpener();
}
