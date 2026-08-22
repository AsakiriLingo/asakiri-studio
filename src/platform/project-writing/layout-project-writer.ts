import type {
  Asset,
  Collection,
  ContentRecord,
  FieldDefinition,
  OutlineSection,
} from "@core/course";
import { isLocaleMap, withFormatFirst, withLocale } from "@core/course";
import { DRAFTS_MANIFEST_PATH, draftBodyPath, draftDir } from "@core/drafts";
import type { ProjectWriter, ProjectWriteResult } from "@core/project-writing";
import type { ProjectSession } from "@core/projects";
import { serializeExercise } from "@platform/project-writing/serialize-exercise";

export interface ProjectFileAccess {
  readTextFile(relativePath: string): Promise<string>;
  writeTextFile(relativePath: string, contents: string): Promise<void>;
  deleteFile(relativePath: string): Promise<void>;
  renameFile(fromRelativePath: string, toRelativePath: string): Promise<void>;
  /** Copies an absolute source file to a project-relative destination. */
  copyFile(sourcePath: string, relativePath: string): Promise<void>;
  /** Copies an image, stripping EXIF/metadata on the way in. */
  copyImage(sourcePath: string, relativePath: string): Promise<void>;
  /** Recursively removes a project-relative directory. Missing is a no-op. */
  removeDir(relativePath: string): Promise<void>;
  hashFile(relativePath: string): Promise<{ sha256: string; byteSize: number }>;
}

export type ResolveProjectFileAccess = (session: ProjectSession) => ProjectFileAccess | null;

const MANIFEST_PATH = "project.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Path from the directory of `fromFilePath` to `targetPath` (both project-relative). */
function relativeFromDir(fromFilePath: string, targetPath: string): string {
  const fromDir = fromFilePath.split("/").slice(0, -1);
  const target = targetPath.split("/");
  let shared = 0;
  while (shared < fromDir.length && shared < target.length && fromDir[shared] === target[shared]) {
    shared += 1;
  }
  const up = fromDir.slice(shared).map(() => "..");
  return [...up, ...target.slice(shared)].join("/");
}

function serializeField(field: FieldDefinition): Record<string, unknown> {
  return {
    id: field.id,
    name: field.name,
    kind: field.kind,
    cardinality: field.cardinality,
    required: field.required,
    ...(field.locale !== undefined ? { locale: field.locale } : {}),
    ...(field.assetKind !== undefined ? { assetKind: field.assetKind } : {}),
  };
}

function serializeCollection(collection: Collection, recordFiles: readonly string[]) {
  return {
    id: collection.id,
    name: collection.name,
    ...(collection.description !== undefined ? { description: collection.description } : {}),
    fields: collection.fields.map(serializeField),
    recordFiles: [...recordFiles],
  };
}

function serializeRecord(record: ContentRecord, base: Record<string, unknown> = {}) {
  return {
    ...base,
    id: record.id,
    collectionId: record.collectionId,
    fields: record.fields,
    ...(record.presentations !== undefined
      ? { presentations: record.presentations.map((p) => ({ ...p, columns: [...p.columns] })) }
      : {}),
  };
}

function serializeOutline(outline: readonly OutlineSection[]): Record<string, unknown>[] {
  return outline.map((section) => ({
    id: section.id,
    title: section.title,
    lessonIds: [...section.lessonIds],
  }));
}

function serializeAsset(asset: Asset): Record<string, unknown> {
  return {
    id: asset.id,
    kind: asset.kind,
    label: asset.label,
    availability: asset.availability,
    file: asset.file,
    mimeType: asset.mimeType,
    ...(asset.expectedFile !== undefined ? { expectedFile: asset.expectedFile } : {}),
    ...(asset.sha256 !== undefined ? { sha256: asset.sha256 } : {}),
    ...(asset.byteSize !== undefined ? { byteSize: asset.byteSize } : {}),
    ...(asset.metadata !== undefined ? { metadata: asset.metadata } : {}),
  };
}

/** The directory a project-relative file path lives in (drops the last segment). */
function dirOf(filePath: string): string {
  return filePath.split("/").slice(0, -1).join("/");
}

async function discardFiles(files: ProjectFileAccess, paths: readonly string[]): Promise<void> {
  for (const path of paths) {
    await files.deleteFile(path).catch(() => undefined);
  }
}

async function discardDir(files: ProjectFileAccess, dir: string): Promise<void> {
  if (dir === "") return;
  await files.removeDir(dir).catch(() => undefined);
}

async function readDraftEntries(files: ProjectFileAccess): Promise<unknown[]> {
  try {
    const parsed: unknown = JSON.parse(await files.readTextFile(DRAFTS_MANIFEST_PATH));
    if (isRecord(parsed) && Array.isArray(parsed.drafts)) return parsed.drafts as unknown[];
  } catch {
    return [];
  }
  return [];
}

function stampContents(contents: string): string {
  try {
    const parsed: unknown = JSON.parse(contents);
    if (!isRecord(parsed)) return contents;
    return `${JSON.stringify(withFormatFirst(parsed), null, 2)}\n`;
  } catch {
    return contents;
  }
}

function mergeLocalized(previous: unknown, next: unknown, locale: string): unknown {
  if (isLocaleMap(previous) && typeof next === "string") {
    return withLocale(previous, locale, next);
  }
  if (Array.isArray(previous) && Array.isArray(next)) {
    const before: readonly unknown[] = previous;
    return (next as readonly unknown[]).map((item) => {
      const id = isRecord(item) ? item.id : undefined;
      const match =
        id === undefined ? undefined : before.find((entry) => isRecord(entry) && entry.id === id);
      return match === undefined ? item : mergeLocalized(match, item, locale);
    });
  }
  if (isRecord(previous) && isRecord(next)) {
    return Object.fromEntries(
      Object.entries(next).map(([key, value]) => [
        key,
        mergeLocalized(previous[key], value, locale),
      ]),
    );
  }
  return next;
}

async function localeOf(files: ProjectFileAccess): Promise<string> {
  try {
    const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
    if (!isRecord(parsed) || !isRecord(parsed.project)) return "en";
    const locale = parsed.project.defaultLocale;
    return typeof locale === "string" ? locale : "en";
  } catch {
    return "en";
  }
}

function stampingAccess(files: ProjectFileAccess): ProjectFileAccess {
  return {
    ...files,
    async writeTextFile(path, contents) {
      let merged = contents;
      try {
        const previous: unknown = JSON.parse(await files.readTextFile(path));
        const next: unknown = JSON.parse(contents);
        if (isRecord(previous) && isRecord(next)) {
          const locale = await localeOf(files);
          merged = JSON.stringify(mergeLocalized(previous, next, locale), null, 2);
        }
      } catch {
        merged = contents;
      }
      await files.writeTextFile(path, stampContents(merged));
    },
  };
}

export function createLayoutProjectWriter(resolveRaw: ResolveProjectFileAccess): ProjectWriter {
  const resolve: ResolveProjectFileAccess = (session) => {
    const files = resolveRaw(session);
    return files === null ? null : stampingAccess(files);
  };

  return {
    async updateProject(session, project): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (!isRecord(parsed)) {
          return { status: "failed", code: "unknown" };
        }
        // Preserve every other manifest key (collections, assets, lessons,
        // outline, format) and merge over the existing project block so
        // unknown project keys survive too.
        const existingProject = isRecord(parsed.project) ? parsed.project : {};
        const next = {
          ...parsed,
          project: {
            ...existingProject,
            id: project.id,
            title: project.title,
            subtitle: project.subtitle,
            description: project.description,
            defaultLocale: project.defaultLocale,
            learningLocales: [...project.learningLocales],
            taughtFlag: project.taughtFlag,
            taughtFlagAssetId: project.taughtFlagAssetId,
            level: project.level,
            estimatedLength: project.estimatedLength,
            version: project.version,
            releasedOn: project.releasedOn,
            license: project.license,
            copyrightHolder: project.copyrightHolder,
            copyrightYear: project.copyrightYear,
            coverAssetId: project.coverAssetId,
            contributors: project.contributors.map((item) => ({
              id: item.id,
              name: item.name,
              role: item.roles?.[0] ?? item.role,
              ...(item.roles !== undefined ? { roles: [...item.roles] } : {}),
              links: [...item.links],
            })),
            funding: project.funding.map((item) => ({
              id: item.id,
              platform: item.platform,
              url: item.url,
            })),
            sponsors: project.sponsors.map((item) => ({
              id: item.id,
              name: item.name,
              tier: item.tier,
              url: item.url,
            })),
          },
        };
        await files.writeTextFile(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async updateOutline(session, outline): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (!isRecord(parsed)) {
          return { status: "failed", code: "unknown" };
        }
        await files.writeTextFile(
          MANIFEST_PATH,
          `${JSON.stringify({ ...parsed, outline: serializeOutline(outline) }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async updateRecord(session, path, record): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(path));
        const base = isRecord(parsed) ? parsed : {};
        // Record file values already match the domain shape, so fields serialize
        // directly; unknown keys (e.g. comments) on the file are preserved.
        const next = serializeRecord(record, base);
        await files.writeTextFile(path, `${JSON.stringify(next, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async updatePartDocument(session, path, document): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        // The body file is the tiptap document itself, so replace it wholesale.
        await files.writeTextFile(path, `${JSON.stringify(document, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async updatePartExercise(session, path, exercise): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(
          path,
          `${JSON.stringify(serializeExercise(exercise), null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async updatePartContentTitle(session, lessonPath, partId, title): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(lessonPath));
        if (!isRecord(parsed) || !Array.isArray(parsed.parts)) {
          return { status: "failed", code: "unknown" };
        }
        const parts = (parsed.parts as unknown[]).map((part) => {
          if (!isRecord(part) || part.id !== partId || !isRecord(part.content)) return part;
          const rest = Object.fromEntries(
            Object.entries(part.content).filter(([key]) => key !== "title"),
          );
          const content = title === "" ? rest : { ...rest, title };
          return { ...part, content };
        });
        await files.writeTextFile(lessonPath, `${JSON.stringify({ ...parsed, parts }, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async updatePartTitle(session, lessonPath, partId, title): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(lessonPath));
        if (!isRecord(parsed) || !Array.isArray(parsed.parts)) {
          return { status: "failed", code: "unknown" };
        }
        const parts = (parsed.parts as unknown[]).map((part) =>
          isRecord(part) && part.id === partId ? { ...part, title } : part,
        );
        await files.writeTextFile(lessonPath, `${JSON.stringify({ ...parsed, parts }, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async deletePart(session, lessonPath, partId, bodyPath): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(lessonPath));
        if (!isRecord(parsed) || !Array.isArray(parsed.parts)) {
          return { status: "failed", code: "unknown" };
        }
        const parts = (parsed.parts as unknown[]).filter(
          (part) => !(isRecord(part) && part.id === partId),
        );
        await files.writeTextFile(lessonPath, `${JSON.stringify({ ...parsed, parts }, null, 2)}\n`);
        await files.removeDir(dirOf(bodyPath));
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async createPart(session, lessonPath, bodyPath, part, document): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(bodyPath, `${JSON.stringify(document, null, 2)}\n`);
      } catch {
        return { status: "failed", code: "unknown" };
      }
      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(lessonPath));
        if (!isRecord(parsed)) {
          await discardDir(files, dirOf(bodyPath));
          return { status: "failed", code: "unknown" };
        }
        const existing = Array.isArray(parsed.parts) ? (parsed.parts as unknown[]) : [];
        const entry = {
          id: part.id,
          title: part.title,
          content: { kind: "tiptap", file: relativeFromDir(lessonPath, bodyPath) },
        };
        const next = { ...parsed, parts: [...existing, entry] };
        await files.writeTextFile(lessonPath, `${JSON.stringify(next, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        await discardDir(files, dirOf(bodyPath));
        return { status: "failed", code: "unknown" };
      }
    },

    async createExercisePart(
      session,
      lessonPath,
      bodyPath,
      part,
      exercise,
    ): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(
          bodyPath,
          `${JSON.stringify(serializeExercise(exercise), null, 2)}\n`,
        );
      } catch {
        return { status: "failed", code: "unknown" };
      }
      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(lessonPath));
        if (!isRecord(parsed)) {
          await discardDir(files, dirOf(bodyPath));
          return { status: "failed", code: "unknown" };
        }
        const existing = Array.isArray(parsed.parts) ? (parsed.parts as unknown[]) : [];
        const entry = {
          id: part.id,
          title: part.title,
          content: { kind: "exercise", file: relativeFromDir(lessonPath, bodyPath) },
        };
        const next = { ...parsed, parts: [...existing, entry] };
        await files.writeTextFile(lessonPath, `${JSON.stringify(next, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        await discardDir(files, dirOf(bodyPath));
        return { status: "failed", code: "unknown" };
      }
    },

    async reorderParts(session, lessonPath, orderedPartIds): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(lessonPath));
        if (!isRecord(parsed) || !Array.isArray(parsed.parts)) {
          return { status: "failed", code: "unknown" };
        }
        const parts = parsed.parts as unknown[];
        const byId = new Map<string, unknown>();
        for (const part of parts) {
          if (isRecord(part) && typeof part.id === "string") byId.set(part.id, part);
        }
        const reordered = orderedPartIds
          .map((id) => byId.get(id))
          .filter((part) => part !== undefined);
        const named = new Set(orderedPartIds);
        for (const part of parts) {
          if (isRecord(part) && typeof part.id === "string" && !named.has(part.id)) {
            reordered.push(part);
          }
        }
        await files.writeTextFile(
          lessonPath,
          `${JSON.stringify({ ...parsed, parts: reordered }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async createLesson(session, lessonPath, lesson, outline): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(
          lessonPath,
          `${JSON.stringify({ id: lesson.id, title: lesson.title, parts: [] }, null, 2)}\n`,
        );
      } catch {
        return { status: "failed", code: "unknown" };
      }
      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (!isRecord(parsed)) {
          await discardDir(files, dirOf(lessonPath));
          return { status: "failed", code: "unknown" };
        }
        const lessons = [...stringArray(parsed.lessons), lessonPath];
        await files.writeTextFile(
          MANIFEST_PATH,
          `${JSON.stringify({ ...parsed, lessons, outline: serializeOutline(outline) }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        await discardDir(files, dirOf(lessonPath));
        return { status: "failed", code: "unknown" };
      }
    },

    async updateLesson(session, lessonPath, lesson): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(lessonPath));
        const base = isRecord(parsed) ? parsed : {};
        const next = { ...base, id: lesson.id, title: lesson.title };
        await files.writeTextFile(lessonPath, `${JSON.stringify(next, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async deleteLesson(session, lessonPath, outline): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (isRecord(parsed)) {
          const lessons = stringArray(parsed.lessons).filter((entry) => entry !== lessonPath);
          await files.writeTextFile(
            MANIFEST_PATH,
            `${JSON.stringify({ ...parsed, lessons, outline: serializeOutline(outline) }, null, 2)}\n`,
          );
        }
        await files.removeDir(dirOf(lessonPath));
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async createRecord(session, collectionPath, recordPath, record): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(
          recordPath,
          `${JSON.stringify(serializeRecord(record), null, 2)}\n`,
        );
      } catch {
        return { status: "failed", code: "unknown" };
      }
      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(collectionPath));
        if (!isRecord(parsed)) {
          await discardFiles(files, [recordPath]);
          return { status: "failed", code: "unknown" };
        }
        const ref = relativeFromDir(collectionPath, recordPath);
        const recordFiles = [...stringArray(parsed.recordFiles), ref];
        await files.writeTextFile(
          collectionPath,
          `${JSON.stringify({ ...parsed, recordFiles }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        await discardFiles(files, [recordPath]);
        return { status: "failed", code: "unknown" };
      }
    },

    async createRecords(session, collectionPath, entries): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }
      if (entries.length === 0) return { status: "saved" };

      const written: string[] = [];
      try {
        for (const entry of entries) {
          await files.writeTextFile(
            entry.path,
            `${JSON.stringify(serializeRecord(entry.record), null, 2)}\n`,
          );
          written.push(entry.path);
        }
        const parsed: unknown = JSON.parse(await files.readTextFile(collectionPath));
        if (!isRecord(parsed)) {
          await discardFiles(files, written);
          return { status: "failed", code: "unknown" };
        }
        const recordFiles = [
          ...stringArray(parsed.recordFiles),
          ...entries.map((entry) => relativeFromDir(collectionPath, entry.path)),
        ];
        await files.writeTextFile(
          collectionPath,
          `${JSON.stringify({ ...parsed, recordFiles }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        await discardFiles(files, written);
        return { status: "failed", code: "unknown" };
      }
    },

    async deleteRecord(session, collectionPath, recordPath): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(collectionPath));
        if (isRecord(parsed)) {
          const ref = relativeFromDir(collectionPath, recordPath);
          const recordFiles = stringArray(parsed.recordFiles).filter((entry) => entry !== ref);
          await files.writeTextFile(
            collectionPath,
            `${JSON.stringify({ ...parsed, recordFiles }, null, 2)}\n`,
          );
        }
        await files.deleteFile(recordPath);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async createCollection(session, collectionPath, collection): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(
          collectionPath,
          `${JSON.stringify(serializeCollection(collection, []), null, 2)}\n`,
        );
      } catch {
        return { status: "failed", code: "unknown" };
      }
      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (!isRecord(parsed)) {
          await discardFiles(files, [collectionPath]);
          return { status: "failed", code: "unknown" };
        }
        const collections = [...stringArray(parsed.collections), collectionPath];
        await files.writeTextFile(
          MANIFEST_PATH,
          `${JSON.stringify({ ...parsed, collections }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        await discardFiles(files, [collectionPath]);
        return { status: "failed", code: "unknown" };
      }
    },

    async deleteCollection(session, collectionPath, recordPaths): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (isRecord(parsed)) {
          const collections = stringArray(parsed.collections).filter(
            (entry) => entry !== collectionPath,
          );
          await files.writeTextFile(
            MANIFEST_PATH,
            `${JSON.stringify({ ...parsed, collections }, null, 2)}\n`,
          );
        }
        for (const recordPath of recordPaths) {
          await files.deleteFile(recordPath);
        }
        await files.deleteFile(collectionPath);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async updateCollection(session, collectionPath, collection): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(collectionPath));
        const recordFiles = isRecord(parsed) ? stringArray(parsed.recordFiles) : [];
        const base = isRecord(parsed) ? parsed : {};
        // Keep unknown keys and the record list; replace the editable schema.
        const next = { ...base, ...serializeCollection(collection, recordFiles) };
        await files.writeTextFile(collectionPath, `${JSON.stringify(next, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async importAsset(
      session,
      assetPath,
      binaryPath,
      sourcePath,
      asset,
    ): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      const discardImport = async () => {
        await discardDir(files, dirOf(assetPath));
        if (dirOf(binaryPath) !== dirOf(assetPath)) {
          await discardFiles(files, [binaryPath]);
        }
      };

      try {
        // Copy the binary first; if that fails the manifest is never touched.
        // Images are stripped of EXIF/metadata; other kinds copy verbatim.
        if (asset.kind === "image") await files.copyImage(sourcePath, binaryPath);
        else await files.copyFile(sourcePath, binaryPath);
      } catch {
        return { status: "failed", code: "unknown" };
      }
      try {
        const digest = await files.hashFile(binaryPath).catch(() => null);
        const stamped = digest === null ? asset : { ...asset, ...digest };
        await files.writeTextFile(
          assetPath,
          `${JSON.stringify(serializeAsset(stamped), null, 2)}\n`,
        );
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (!isRecord(parsed)) {
          await discardImport();
          return { status: "failed", code: "unknown" };
        }
        const assets = [...stringArray(parsed.assets), assetPath];
        await files.writeTextFile(
          MANIFEST_PATH,
          `${JSON.stringify({ ...parsed, assets }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
        await discardImport();
        return { status: "failed", code: "unknown" };
      }
    },

    async deleteAsset(session, assetPath): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (isRecord(parsed)) {
          const assets = stringArray(parsed.assets).filter((entry) => entry !== assetPath);
          await files.writeTextFile(
            MANIFEST_PATH,
            `${JSON.stringify({ ...parsed, assets }, null, 2)}\n`,
          );
        }
        // Remove the whole media/assets/<id> folder (descriptor + binary).
        await files.removeDir(dirOf(assetPath));
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async writeAttribution(session, markdown): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile("ATTRIBUTION.md", markdown);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async renameAsset(session, assetPath, oldFile, asset): Promise<ProjectWriteResult> {
      const files = resolve(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const dir = dirOf(assetPath);
        if (oldFile && asset.file && oldFile !== asset.file) {
          await files.renameFile(`${dir}/${oldFile}`, `${dir}/${asset.file}`);
        }
        const parsed: unknown = JSON.parse(await files.readTextFile(assetPath));
        const base = isRecord(parsed) ? parsed : {};
        const next = { ...base, ...serializeAsset(asset) };
        await files.writeTextFile(assetPath, `${JSON.stringify(next, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async importDraft(session, draft, document): Promise<ProjectWriteResult> {
      const files = resolveRaw(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(
          draftBodyPath(draft.id),
          `${JSON.stringify(document, null, 2)}\n`,
        );
      } catch {
        return { status: "failed", code: "unknown" };
      }
      try {
        const entries = (await readDraftEntries(files)).filter(
          (entry) => !(isRecord(entry) && entry.id === draft.id),
        );
        const drafts = [
          ...entries,
          {
            id: draft.id,
            title: draft.title,
            updatedAt: draft.updatedAt,
            body: `${draft.id}/document.json`,
          },
        ];
        await files.writeTextFile(DRAFTS_MANIFEST_PATH, `${JSON.stringify({ drafts }, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        await discardDir(files, draftDir(draft.id));
        return { status: "failed", code: "unknown" };
      }
    },

    async updateDraft(session, draftId, document, updatedAt): Promise<ProjectWriteResult> {
      const files = resolveRaw(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        await files.writeTextFile(draftBodyPath(draftId), `${JSON.stringify(document, null, 2)}\n`);
        const drafts = (await readDraftEntries(files)).map((entry) =>
          isRecord(entry) && entry.id === draftId ? { ...entry, updatedAt } : entry,
        );
        await files.writeTextFile(DRAFTS_MANIFEST_PATH, `${JSON.stringify({ drafts }, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async renameDraft(session, draftId, title): Promise<ProjectWriteResult> {
      const files = resolveRaw(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const drafts = (await readDraftEntries(files)).map((entry) =>
          isRecord(entry) && entry.id === draftId ? { ...entry, title } : entry,
        );
        await files.writeTextFile(DRAFTS_MANIFEST_PATH, `${JSON.stringify({ drafts }, null, 2)}\n`);
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },

    async deleteDraft(session, draftId): Promise<ProjectWriteResult> {
      const files = resolveRaw(session);
      if (!files) {
        return { status: "failed", code: "unavailable" };
      }

      try {
        const drafts = (await readDraftEntries(files)).filter(
          (entry) => !(isRecord(entry) && entry.id === draftId),
        );
        await files.writeTextFile(DRAFTS_MANIFEST_PATH, `${JSON.stringify({ drafts }, null, 2)}\n`);
        await discardDir(files, draftDir(draftId));
        return { status: "saved" };
      } catch {
        return { status: "failed", code: "unknown" };
      }
    },
  };
}
