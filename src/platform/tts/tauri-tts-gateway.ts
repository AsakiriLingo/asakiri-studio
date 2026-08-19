import { Channel, invoke } from "@tauri-apps/api/core";
import type { PickedMediaFile } from "@core/project-media";
import type { CatalogVoice, DownloadProgress, TtsGateway, TtsVoice } from "@core/tts";

export function createTauriTtsGateway(): TtsGateway {
  return {
    async listVoices(): Promise<readonly TtsVoice[]> {
      try {
        return await invoke<TtsVoice[]>("list_tts_voices");
      } catch {
        return [];
      }
    },

    async synthesizeToTemp(text, voice, fileName): Promise<PickedMediaFile | null> {
      try {
        const path = await invoke<string>("synthesize_tts", { text, voice, fileName });
        return { path, name: fileName };
      } catch {
        return null;
      }
    },

    async listAvailableVoices(): Promise<readonly CatalogVoice[]> {
      try {
        return await invoke<CatalogVoice[]>("list_available_voices");
      } catch {
        return [];
      }
    },

    async downloadVoice(voiceId, onProgress?: DownloadProgress): Promise<boolean> {
      try {
        const channel = new Channel<{ downloaded: number; total: number }>();
        if (onProgress) {
          channel.onmessage = (message) => {
            onProgress(message.downloaded, message.total);
          };
        }
        await invoke("download_voice", { voiceId, onProgress: channel });
        return true;
      } catch {
        return false;
      }
    },

    async removeVoice(voiceId): Promise<boolean> {
      try {
        await invoke("remove_voice", { voiceId });
        return true;
      } catch {
        return false;
      }
    },
  };
}
