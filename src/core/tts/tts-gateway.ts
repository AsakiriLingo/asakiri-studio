import type { PickedMediaFile } from "@core/project-media";

export interface TtsVoice {
  readonly name: string;
  readonly locale: string;
}

export interface CatalogVoice {
  readonly id: string;
  readonly name: string;
  readonly quality: string;
  readonly languageCode: string;
  readonly languageEnglish: string;
  readonly languageNative: string;
  readonly region: string;
  readonly country: string;
  readonly sizeBytes: number;
  readonly sampleUrl: string;
  readonly installed: boolean;
}

export type DownloadProgress = (downloaded: number, total: number) => void;

export type TtsSaveResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

export interface TtsGateway {
  listVoices(): Promise<readonly TtsVoice[]>;
  synthesizeToTemp(text: string, voice: string, fileName: string): Promise<PickedMediaFile>;
  previewVoice(text: string, voice: string): Promise<string>;
  listAvailableVoices(): Promise<readonly CatalogVoice[]>;
  downloadVoice(voiceId: string, onProgress?: DownloadProgress): Promise<boolean>;
  removeVoice(voiceId: string): Promise<boolean>;
}
