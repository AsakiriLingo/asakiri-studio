import type { WindowTheme, WindowThemeGateway } from "@core/appearance";

export class TauriWindowThemeGateway implements WindowThemeGateway {
  async setTheme(theme: WindowTheme): Promise<void> {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setTheme(theme);
  }
}
