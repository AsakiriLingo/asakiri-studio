import type { ProjectSession } from "@core/projects";

/**
 * Reads media binaries out of a project so the UI can preview them. Returns a
 * `data:` URL for the file, or `null` if it cannot be read.
 */
export interface AssetReader {
  readAssetDataUrl(
    session: ProjectSession,
    relativePath: string,
    mimeType: string,
  ): Promise<string | null>;
}
