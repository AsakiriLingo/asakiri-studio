import type { Asset, Collection, ContentRecord, FieldDefinition } from "@core/course";
import type { ProjectWriter, ProjectWriteResult } from "@core/project-writing";
import type { ProjectSession } from "@core/projects";

export interface ProjectFileAccess {
  readTextFile(relativePath: string): Promise<string>;
  writeTextFile(relativePath: string, contents: string): Promise<void>;
  deleteFile(relativePath: string): Promise<void>;
  /** Copies an absolute source file to a project-relative destination. */
  copyFile(sourcePath: string, relativePath: string): Promise<void>;
  /** Recursively removes a project-relative directory. Missing is a no-op. */
  removeDir(relativePath: string): Promise<void>;
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
  };
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
    ...(asset.metadata !== undefined ? { metadata: asset.metadata } : {}),
  };
}

/** The directory a project-relative file path lives in (drops the last segment). */
function dirOf(filePath: string): string {
  return filePath.split("/").slice(0, -1).join("/");
}

export function createLayoutProjectWriter(resolve: ResolveProjectFileAccess): ProjectWriter {
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
            level: project.level,
            estimatedLength: project.estimatedLength,
            license: project.license,
            copyrightHolder: project.copyrightHolder,
            copyrightYear: project.copyrightYear,
            coverAssetId: project.coverAssetId,
            contributors: project.contributors.map((item) => ({
              id: item.id,
              name: item.name,
              role: item.role,
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
        const next = {
          ...base,
          id: record.id,
          collectionId: record.collectionId,
          fields: record.fields,
        };
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
        const parsed: unknown = JSON.parse(await files.readTextFile(collectionPath));
        if (!isRecord(parsed)) {
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
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (!isRecord(parsed)) {
          return { status: "failed", code: "unknown" };
        }
        const collections = [...stringArray(parsed.collections), collectionPath];
        await files.writeTextFile(
          MANIFEST_PATH,
          `${JSON.stringify({ ...parsed, collections }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
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

      try {
        // Copy the binary first; if that fails the manifest is never touched.
        await files.copyFile(sourcePath, binaryPath);
        await files.writeTextFile(assetPath, `${JSON.stringify(serializeAsset(asset), null, 2)}\n`);
        const parsed: unknown = JSON.parse(await files.readTextFile(MANIFEST_PATH));
        if (!isRecord(parsed)) {
          return { status: "failed", code: "unknown" };
        }
        const assets = [...stringArray(parsed.assets), assetPath];
        await files.writeTextFile(
          MANIFEST_PATH,
          `${JSON.stringify({ ...parsed, assets }, null, 2)}\n`,
        );
        return { status: "saved" };
      } catch {
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
  };
}
