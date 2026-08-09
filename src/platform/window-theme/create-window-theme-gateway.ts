import type { WindowThemeGateway } from "@core/appearance";
import { TauriWindowThemeGateway } from "@platform/window-theme/tauri-window-theme-gateway";

export function createWindowThemeGateway(): WindowThemeGateway {
  return new TauriWindowThemeGateway();
}
