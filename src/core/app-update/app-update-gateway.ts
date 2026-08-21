export interface AvailableUpdate {
  readonly version: string;
  readonly currentVersion: string;
  readonly notes: string;
  readonly date: string | null;
}

export interface AppUpdateGateway {
  readonly check: () => Promise<AvailableUpdate | null>;
  readonly downloadAndInstall: () => Promise<void>;
  readonly relaunch: () => Promise<void>;
  readonly getCurrentVersion: () => Promise<string>;
}
