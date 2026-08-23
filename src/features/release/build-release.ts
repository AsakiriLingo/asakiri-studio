import type { Course, CourseSources } from "@core/course";
import type { ProjectSession } from "@core/projects";
import {
  MANIFEST_NAME,
  RELEASE_DIR,
  buildManifest,
  packFileName,
  planRelease,
  type AkcInfo,
  type PackOwner,
  type PlannedPack,
  type ReleaseHistoryFile,
  type ReleaseState,
  type WrittenBlobEntry,
  type WrittenPack,
} from "@core/packaging";
import type { ReleaseDeps } from "@features/release/ports";

function releasePath(name: string): string {
  return `${RELEASE_DIR}/${name}`;
}

function ownerLabel(owner: PackOwner, course: Course): string {
  if (owner === null) return "shared media";
  const section = course.outline.find((entry) => entry.id === owner);
  return section?.title ?? owner;
}

async function writePack(
  deps: ReleaseDeps,
  session: ProjectSession,
  pack: PlannedPack,
  blobInfo: ReturnType<typeof planRelease>["blobInfo"],
): Promise<WrittenPack> {
  const buildingName = `.building-${pack.owner ?? "common"}-${String(pack.partIndex)}.akp`;
  const zip = await deps.writer.writeStoredZip(session, releasePath(buildingName), pack.entries);
  const name = packFileName(pack.owner, zip.sha256);
  await deps.gateway.rename(session, releasePath(buildingName), releasePath(name));

  const entries: WrittenBlobEntry[] = zip.entries.map((entry) => {
    const info = blobInfo[entry.name];
    return {
      sha256: entry.name,
      offset: entry.offset,
      length: entry.length,
      mime: info?.mime ?? "application/octet-stream",
      byteSize: info?.byteSize ?? entry.length,
    };
  });

  return {
    owner: pack.owner,
    partIndex: pack.partIndex,
    name,
    sha256: zip.sha256,
    byteSize: zip.byteSize,
    entries,
  };
}

export async function buildRelease(
  deps: ReleaseDeps,
  session: ProjectSession,
  course: Course,
  sources: CourseSources,
): Promise<ReleaseState> {
  const prior = await deps.store.load(session.id);
  const plan = planRelease({ course, sources, prior });

  const akcZip = await deps.writer.writeStoredZip(
    session,
    releasePath(plan.akc.name),
    plan.akc.entries,
  );
  const akc: AkcInfo = { name: plan.akc.name, sha256: akcZip.sha256, byteSize: akcZip.byteSize };

  const akcChanged = prior?.akc.sha256 !== akc.sha256;
  const structureChanged = plan.packsToWrite.length > 0 || plan.orphanFiles.length > 0;
  if (prior && !akcChanged && !structureChanged) return prior;

  const writtenPacks: WrittenPack[] = [];
  for (const pack of plan.packsToWrite) {
    writtenPacks.push(await writePack(deps, session, pack, plan.blobInfo));
  }

  const packs = [...plan.packsToReuse, ...writtenPacks];
  const revision = (prior?.revision ?? 0) + 1;

  const manifest = buildManifest({
    course: {
      id: course.project.id,
      revision,
      version: course.project.version,
      title: course.project.title,
      defaultLocale: course.project.defaultLocale,
    },
    akc,
    packs,
  });

  await deps.gateway.writeText(
    session,
    releasePath(MANIFEST_NAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  for (const name of plan.orphanFiles) {
    await deps.gateway.deleteFile(session, releasePath(name));
  }

  const priorLabels = new Map(
    (prior?.packs ?? []).map((record) => [
      record.written.name,
      ownerLabel(record.written.owner, course),
    ]),
  );
  const addedOrReplaced: ReleaseHistoryFile[] = [
    ...(akcChanged ? [{ name: akc.name, label: "course data" }] : []),
    ...writtenPacks.map((pack) => ({ name: pack.name, label: ownerLabel(pack.owner, course) })),
  ];
  const deleted: ReleaseHistoryFile[] = plan.orphanFiles.map((name) => ({
    name,
    label: priorLabels.get(name) ?? "media",
  }));

  const historyEntry = {
    id: deps.clock.newId(),
    at: deps.clock.now(),
    revision,
    version: course.project.version,
    addedOrReplaced,
    deleted,
  };

  const state: ReleaseState = {
    revision,
    assignments: plan.assignments,
    packs: packs.map((written) => ({
      blobShas: written.entries.map((entry) => entry.sha256),
      written,
    })),
    akc,
    manifest,
    missingAssets: plan.missingAssetIds.length,
    history: [historyEntry, ...(prior?.history ?? [])],
    uploadedMark: prior?.uploadedMark ?? null,
  };

  await deps.store.save(session.id, state);
  return state;
}
