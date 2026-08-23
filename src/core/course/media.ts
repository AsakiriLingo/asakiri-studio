export type AssetKind = "audio" | "image" | "video";

export type AssetAvailability = "ready" | "placeholder";

export interface Asset {
  readonly id: string;
  readonly kind: AssetKind;
  readonly label: string;
  readonly availability: AssetAvailability;
  readonly file: string | null;
  readonly expectedFile?: string;
  readonly mimeType: string;
  readonly sha256?: string;
  readonly byteSize?: number;
  readonly folderId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface MediaFolder {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
}

export const MAX_MEDIA_FOLDER_DEPTH = 3;

export function mediaFolderChildren(
  folders: readonly MediaFolder[],
  parentId: string | null,
): MediaFolder[] {
  return folders.filter((folder) => folder.parentId === parentId);
}

export function mediaFolderDepth(folders: readonly MediaFolder[], id: string): number {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  let depth = 1;
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current?.parentId != null && !seen.has(current.id)) {
    seen.add(current.id);
    current = byId.get(current.parentId);
    depth += 1;
  }
  return depth;
}

export function canAddSubfolder(folders: readonly MediaFolder[], parentId: string | null): boolean {
  if (parentId === null) return true;
  return mediaFolderDepth(folders, parentId) < MAX_MEDIA_FOLDER_DEPTH;
}

export function mediaFolderSubtreeIds(folders: readonly MediaFolder[], id: string): string[] {
  const ids = [id];
  for (const child of mediaFolderChildren(folders, id)) {
    ids.push(...mediaFolderSubtreeIds(folders, child.id));
  }
  return ids;
}

export function foldersAfterDelete(folders: readonly MediaFolder[], id: string): MediaFolder[] {
  const removed = folders.find((folder) => folder.id === id);
  const parentId = removed?.parentId ?? null;
  return folders
    .filter((folder) => folder.id !== id)
    .map((folder) => (folder.parentId === id ? { ...folder, parentId } : folder));
}

interface MediaType {
  readonly kind: AssetKind;
  readonly mimeType: string;
}

// Extension → media type. Covers the formats the learner app can play back.
const MEDIA_TYPES: Readonly<Record<string, MediaType>> = {
  png: { kind: "image", mimeType: "image/png" },
  jpg: { kind: "image", mimeType: "image/jpeg" },
  jpeg: { kind: "image", mimeType: "image/jpeg" },
  gif: { kind: "image", mimeType: "image/gif" },
  webp: { kind: "image", mimeType: "image/webp" },
  svg: { kind: "image", mimeType: "image/svg+xml" },
  avif: { kind: "image", mimeType: "image/avif" },
  mp3: { kind: "audio", mimeType: "audio/mpeg" },
  m4a: { kind: "audio", mimeType: "audio/mp4" },
  aac: { kind: "audio", mimeType: "audio/aac" },
  wav: { kind: "audio", mimeType: "audio/wav" },
  ogg: { kind: "audio", mimeType: "audio/ogg" },
  opus: { kind: "audio", mimeType: "audio/opus" },
  flac: { kind: "audio", mimeType: "audio/flac" },
  mp4: { kind: "video", mimeType: "video/mp4" },
  webm: { kind: "video", mimeType: "video/webm" },
  mov: { kind: "video", mimeType: "video/quicktime" },
};

export const SUPPORTED_MEDIA_EXTENSIONS: readonly string[] = Object.keys(MEDIA_TYPES);

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** The media type for a file name, or `null` if the extension is unsupported. */
export function mediaTypeForFile(fileName: string): MediaType | null {
  return MEDIA_TYPES[extensionOf(fileName)] ?? null;
}

/** A human-friendly label derived from a file name (its base, without extension). */
export function labelForFile(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return base.trim() || fileName;
}
