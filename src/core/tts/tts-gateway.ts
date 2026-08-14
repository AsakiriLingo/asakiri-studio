import type { PickedMediaFile } from "@core/project-media";

export interface TtsVoice {
  readonly name: string;
  readonly locale: string;
}

export interface TtsGateway {
  listVoices(): Promise<readonly TtsVoice[]>;
  synthesizeToTemp(text: string, voice: string, fileName: string): Promise<PickedMediaFile | null>;
}
