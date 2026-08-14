import type { LinkOpener } from "@core/links";

export class TauriLinkOpener implements LinkOpener {
  open = async (url: string): Promise<void> => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  };
}
