export interface AppMenuGateway {
  readonly onOpenPreferences: (listener: () => void) => () => void;
}
