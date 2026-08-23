import type { Course, CourseProject, CourseSources } from "@core/course";
import { DEFAULT_PACK_SIZE_CAP } from "@core/packaging/constants";
import type { BlobRef, PackOwner, StoredZipEntry, WrittenPack } from "@core/packaging/model";
import { planPacks } from "@core/packaging/pack-plan";
import { collectReachableBlobs } from "@core/packaging/reachability";
import type { ReleaseState } from "@core/packaging/release-state";

export interface PlannedPack {
  readonly owner: PackOwner;
  readonly partIndex: number;
  readonly blobShas: readonly string[];
  readonly entries: readonly StoredZipEntry[];
}

export interface ReleasePlan {
  readonly akc: { readonly name: string; readonly entries: readonly StoredZipEntry[] };
  readonly packsToWrite: readonly PlannedPack[];
  readonly packsToReuse: readonly WrittenPack[];
  readonly orphanFiles: readonly string[];
  readonly assignments: Readonly<Record<string, PackOwner>>;
  readonly blobInfo: Readonly<Record<string, BlobRef>>;
}

export function akcFileName(project: CourseProject): string {
  const base = project.id.replace(/^course_/, "").replace(/_/g, "-");
  return `${base || "course"}.akc`;
}

function packKey(owner: PackOwner, partIndex: number): string {
  return `${owner ?? " common"}#${String(partIndex)}`;
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function akcEntries(sources: CourseSources): StoredZipEntry[] {
  const paths = [
    sources.project,
    ...Object.values(sources.collections),
    ...Object.values(sources.records),
    ...Object.values(sources.assets),
    ...Object.values(sources.lessons),
    ...Object.values(sources.parts),
  ];
  const seen = new Set<string>();
  const entries: StoredZipEntry[] = [];
  for (const path of paths) {
    if (seen.has(path)) continue;
    seen.add(path);
    entries.push({ name: path, sourceRelativePath: path });
  }
  return entries;
}

export function planRelease(input: {
  course: Course;
  sources: CourseSources;
  prior: ReleaseState | null;
  sizeCap?: number;
}): ReleasePlan {
  const reachable = collectReachableBlobs(input.course);
  const sourceBySha = new Map(reachable.map((blob) => [blob.sha256, blob.sourceRelativePath]));
  const blobInfo: Record<string, BlobRef> = {};
  for (const blob of reachable) {
    blobInfo[blob.sha256] = { sha256: blob.sha256, byteSize: blob.byteSize, mime: blob.mime };
  }

  const plan = planPacks({
    blobs: reachable,
    unitOrder: input.course.outline.map((section) => section.id),
    prior: input.prior?.assignments ?? {},
    sizeCap: input.sizeCap ?? DEFAULT_PACK_SIZE_CAP,
  });

  const priorByKey = new Map(
    (input.prior?.packs ?? []).map((record) => [
      packKey(record.written.owner, record.written.partIndex),
      record,
    ]),
  );

  const packsToWrite: PlannedPack[] = [];
  const packsToReuse: WrittenPack[] = [];
  const reusedNames = new Set<string>();

  for (const pack of plan.packs) {
    const blobShas = pack.blobs.map((blob) => blob.sha256);
    const priorRecord = priorByKey.get(packKey(pack.owner, pack.partIndex));
    if (priorRecord && sameOrder(priorRecord.blobShas, blobShas)) {
      packsToReuse.push(priorRecord.written);
      reusedNames.add(priorRecord.written.name);
      continue;
    }
    packsToWrite.push({
      owner: pack.owner,
      partIndex: pack.partIndex,
      blobShas,
      entries: blobShas.map((sha256) => ({
        name: sha256,
        sourceRelativePath: sourceBySha.get(sha256) ?? "",
      })),
    });
  }

  const orphanFiles = (input.prior?.packs ?? [])
    .map((record) => record.written.name)
    .filter((name) => !reusedNames.has(name));

  return {
    akc: { name: akcFileName(input.course.project), entries: akcEntries(input.sources) },
    packsToWrite,
    packsToReuse,
    orphanFiles,
    assignments: plan.assignments,
    blobInfo,
  };
}
