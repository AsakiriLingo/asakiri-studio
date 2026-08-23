import { COMMON_PACK_OWNER, PACK_EXTENSION } from "@core/packaging/constants";
import type { PackOwner } from "@core/packaging/model";

export function shortHash(sha256: string, length = 8): string {
  return sha256.slice(0, length);
}

export function unitShortId(unitId: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < unitId.length; index += 1) {
    hash ^= unitId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 4);
}

export function packFileName(owner: PackOwner, contentSha256: string): string {
  const hash = shortHash(contentSha256);
  if (owner === COMMON_PACK_OWNER) {
    return `common-${hash}${PACK_EXTENSION}`;
  }
  return `unit-${unitShortId(owner)}-${hash}${PACK_EXTENSION}`;
}
