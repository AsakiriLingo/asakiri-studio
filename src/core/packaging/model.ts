export interface BlobRef {
  readonly sha256: string;
  readonly byteSize: number;
  readonly mime: string;
}

export interface PlannableBlob extends BlobRef {
  readonly referencingUnitIds: readonly string[];
}

export type PackOwner = string | null;

export interface PlanInput {
  readonly blobs: readonly PlannableBlob[];
  readonly unitOrder: readonly string[];
  readonly prior: Readonly<Record<string, PackOwner>>;
  readonly sizeCap: number;
}

export interface LogicalPack {
  readonly owner: PackOwner;
  readonly partIndex: number;
  readonly blobs: readonly BlobRef[];
}

export interface PackPlan {
  readonly packs: readonly LogicalPack[];
  readonly assignments: Readonly<Record<string, PackOwner>>;
}

export interface WrittenBlobEntry {
  readonly sha256: string;
  readonly offset: number;
  readonly length: number;
  readonly mime: string;
  readonly byteSize: number;
}

export interface WrittenPack {
  readonly owner: PackOwner;
  readonly partIndex: number;
  readonly name: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly entries: readonly WrittenBlobEntry[];
}

export interface AkcInfo {
  readonly name: string;
  readonly sha256: string;
  readonly byteSize: number;
}

export interface ManifestCourse {
  readonly id: string;
  readonly revision: number;
  readonly version: string;
  readonly title: string;
  readonly defaultLocale: string;
}

export interface ManifestInput {
  readonly course: ManifestCourse;
  readonly akc: AkcInfo;
  readonly packs: readonly WrittenPack[];
}

export interface ManifestPackEntry {
  readonly name: string;
  readonly sha256: string;
  readonly byteSize: number;
}

export interface ManifestAssetEntry {
  readonly pack: string;
  readonly offset: number;
  readonly length: number;
  readonly mime: string;
  readonly byteSize: number;
}

export interface ManifestCourseEntry extends ManifestCourse {
  readonly data: AkcInfo;
}

export interface Manifest {
  readonly format: string;
  readonly formatVersion: number;
  readonly course: ManifestCourseEntry;
  readonly packs: readonly ManifestPackEntry[];
  readonly assets: Readonly<Record<string, ManifestAssetEntry>>;
}
