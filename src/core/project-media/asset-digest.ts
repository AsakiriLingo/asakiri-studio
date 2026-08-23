import type { ProjectSession } from "@core/projects";

export interface AssetDigestRequest {
  readonly assetPath: string;
  readonly binaryPath: string;
}

export interface AssetDigestResult {
  readonly assetPath: string;
  readonly sha256: string;
  readonly byteSize: number;
}

export interface AssetDigestBackfiller {
  backfill(
    session: ProjectSession,
    requests: readonly AssetDigestRequest[],
  ): Promise<AssetDigestResult[]>;
}
