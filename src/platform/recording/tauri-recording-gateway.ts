import { invoke } from "@tauri-apps/api/core";
import type { PickedMediaFile } from "@core/project-media";
import type { RecordingGateway } from "@core/recording";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function createTauriRecordingGateway(): RecordingGateway {
  return {
    async saveToTemp(fileName, bytes): Promise<PickedMediaFile | null> {
      try {
        const path = await invoke<string>("write_temp_media", {
          fileName,
          dataBase64: toBase64(bytes),
        });
        return { path, name: fileName };
      } catch {
        return null;
      }
    },
  };
}
