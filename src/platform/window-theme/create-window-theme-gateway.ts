import type { WindowThemeGateway } from "@core/appearance";
import { getRuntimeKind } from "@platform/runtime/runtime";
import { BrowserWindowThemeGateway } from "@platform/window-theme/browser-window-theme-gateway";
import { TauriWindowThemeGateway } from "@platform/window-theme/tauri-window-theme-gateway";

export function createWindowThemeGateway(): WindowThemeGateway {
  return getRuntimeKind() === "tauri"
    ? new TauriWindowThemeGateway()
    : new BrowserWindowThemeGateway();
}
