export type WindowTheme = "light" | "dark";

export interface WindowThemeGateway {
  readonly setTheme: (theme: WindowTheme) => Promise<void>;
}
