import type { PickedMediaFile } from "@core/project-media";

export interface RecordingGateway {
  saveToTemp(fileName: string, bytes: Uint8Array): Promise<PickedMediaFile | null>;
}
