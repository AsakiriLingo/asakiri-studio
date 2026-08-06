import type { WindowThemeGateway } from "@core/appearance";

export class BrowserWindowThemeGateway implements WindowThemeGateway {
  async setTheme(): Promise<void> {
    // The document theme is sufficient outside a native application window.
  }
}
