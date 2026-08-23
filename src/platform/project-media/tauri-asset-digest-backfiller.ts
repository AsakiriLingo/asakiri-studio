import { invoke } from "@tauri-apps/api/core";
import type { AssetDigestBackfiller, AssetDigestResult } from "@core/project-media";
import type { ProjectLocationRegistry } from "@platform/project-location/project-location-registry";

export function createAssetDigestBackfiller(
  locations: ProjectLocationRegistry,
): AssetDigestBackfiller {
  return {
    async backfill(session, requests) {
      const location = locations.get(session.id);
      if (!location || requests.length === 0) return [];
      return invoke<AssetDigestResult[]>("backfill_asset_digests", {
        rootPath: location.rootPath,
        requests: requests.map((request) => ({
          assetPath: request.assetPath,
          binaryPath: request.binaryPath,
        })),
      });
    },
  };
}
