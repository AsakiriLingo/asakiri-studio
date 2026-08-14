import { invoke } from "@tauri-apps/api/core";
import type { PickedMediaFile } from "@core/project-media";
import type { TtsGateway, TtsVoice } from "@core/tts";

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
  };
}
