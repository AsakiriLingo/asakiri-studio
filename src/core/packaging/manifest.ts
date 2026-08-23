import { PACKAGE_FORMAT, PACKAGE_FORMAT_VERSION } from "@core/packaging/constants";
import type {
  Manifest,
  ManifestAssetEntry,
  ManifestInput,
  ManifestPackEntry,
} from "@core/packaging/model";

export function buildManifest(input: ManifestInput): Manifest {
  const packs: ManifestPackEntry[] = input.packs.map((pack) => ({
    name: pack.name,
    sha256: pack.sha256,
    byteSize: pack.byteSize,
  }));

  const assets: Record<string, ManifestAssetEntry> = {};
  for (const pack of input.packs) {
    for (const entry of pack.entries) {
      if (assets[entry.sha256]) continue;
      assets[entry.sha256] = {
        pack: pack.name,
        offset: entry.offset,
        length: entry.length,
        mime: entry.mime,
        byteSize: entry.byteSize,
      };
    }
  }

  return {
    format: PACKAGE_FORMAT,
    formatVersion: PACKAGE_FORMAT_VERSION,
    course: {
      id: input.course.id,
      revision: input.course.revision,
      version: input.course.version,
      title: input.course.title,
      defaultLocale: input.course.defaultLocale,
      data: input.akc,
    },
    packs,
    assets,
  };
}
