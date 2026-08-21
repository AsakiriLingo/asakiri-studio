import type { Update } from "@tauri-apps/plugin-updater";
import type { AppUpdateGateway, AvailableUpdate } from "@core/app-update";

export class TauriAppUpdateGateway implements AppUpdateGateway {
  private pending: Update | null = null;

  check = async (): Promise<AvailableUpdate | null> => {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      this.pending = update;
      if (!update) return null;
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        notes: update.body ?? "",
        date: update.date ?? null,
      };
    } catch {
      this.pending = null;
      return null;
    }
  };

  downloadAndInstall = async (): Promise<void> => {
    if (!this.pending) throw new Error("No update available to install.");
    await this.pending.downloadAndInstall();
  };

  relaunch = async (): Promise<void> => {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  };

  getCurrentVersion = async (): Promise<string> => {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      return await getVersion();
    } catch {
      return "";
    }
  };
}
