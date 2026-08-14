import type { AppUpdateGateway } from "@core/app-update";
import { TauriAppUpdateGateway } from "@platform/app-update/tauri-app-update-gateway";

export function createAppUpdateGateway(): AppUpdateGateway {
  return new TauriAppUpdateGateway();
}
