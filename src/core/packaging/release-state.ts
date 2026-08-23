import type { AkcInfo, Manifest, PackOwner, WrittenPack } from "@core/packaging/model";

export interface ReleaseHistoryFile {
  readonly name: string;
  readonly label: string;
}

export interface ReleaseHistoryEntry {
  readonly id: string;
  readonly at: string;
  readonly revision: number;
  readonly version: string;
  readonly addedOrReplaced: readonly ReleaseHistoryFile[];
  readonly deleted: readonly ReleaseHistoryFile[];
}

export interface ReleasePackRecord {
  readonly blobShas: readonly string[];
  readonly written: WrittenPack;
}

export interface ReleaseState {
  readonly revision: number;
  readonly assignments: Readonly<Record<string, PackOwner>>;
  readonly packs: readonly ReleasePackRecord[];
  readonly akc: AkcInfo;
  readonly manifest: Manifest;
  readonly history: readonly ReleaseHistoryEntry[];
  readonly uploadedMark: string | null;
}
