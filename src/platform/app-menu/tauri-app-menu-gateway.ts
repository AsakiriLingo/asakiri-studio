import type { AppMenuGateway } from "@core/app-menu";

export class TauriAppMenuGateway implements AppMenuGateway {
  onOpenPreferences = (listener: () => void): (() => void) => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen("open-preferences", () => {
        listener();
      }).then((stop) => {
        if (cancelled) stop();
        else unlisten = stop;
      }),
    );
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  };
}

export function createAppMenuGateway(): AppMenuGateway {
  return new TauriAppMenuGateway();
}
