export type WindowTheme = "light" | "dark";

export interface WindowThemeGateway {
  setTheme(theme: WindowTheme): Promise<void>;
}
