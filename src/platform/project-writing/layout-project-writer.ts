import type { ProjectWriter, ProjectWriteResult } from "@core/project-writing";
import type { ProjectSession } from "@core/projects";

export interface ProjectFileAccess {
  readTextFile(relativePath: string): Promise<string>;
  writeTextFile(relativePath: string, contents: string): Promise<void>;
}

export type ResolveProjectFileAccess = (session: ProjectSession) => ProjectFileAccess | null;

const MANIFEST_PATH = "project.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
        // outline, format) and replace only the project block.
        const next = {
          ...parsed,
          project: {
            id: project.id,
            title: project.title,
            description: project.description,
            defaultLocale: project.defaultLocale,
            learningLocales: [...project.learningLocales],
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
  };
}
