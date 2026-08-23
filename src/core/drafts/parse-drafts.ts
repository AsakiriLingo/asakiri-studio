import type { CourseFileReader, TiptapDocument } from "@core/course";
import type { Draft, DraftSources, LoadedDrafts } from "@core/drafts/draft";

export const DRAFTS_DIR = ".asakiri/drafts";
export const DRAFTS_MANIFEST_PATH = `${DRAFTS_DIR}/drafts.json`;

export function draftBodyPath(draftId: string): string {
  return `${DRAFTS_DIR}/${draftId}/document.json`;
}

export function draftDir(draftId: string): string {
  return `${DRAFTS_DIR}/${draftId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asDocument(value: unknown): TiptapDocument | null {
  if (isObject(value) && value.type === "doc") return value as unknown as TiptapDocument;
  return null;
}

async function readJson(files: CourseFileReader, path: string): Promise<unknown> {
  try {
    return JSON.parse(await files.readTextFile(path));
  } catch {
    return null;
  }
}

const EMPTY: LoadedDrafts = {
  drafts: [],
  sources: { manifest: DRAFTS_MANIFEST_PATH, bodies: {} },
};

export async function parseDrafts(files: CourseFileReader): Promise<LoadedDrafts> {
  const manifest = await readJson(files, DRAFTS_MANIFEST_PATH);
  if (!isObject(manifest) || !Array.isArray(manifest.drafts)) return EMPTY;

  const drafts: Draft[] = [];
  const bodies: Record<string, string> = {};
  for (const entry of manifest.drafts) {
    if (!isObject(entry)) continue;
    const id = str(entry.id);
    const body = str(entry.body);
    if (id === null || body === null) continue;
    const bodyPath = `${DRAFTS_DIR}/${body}`;
    const document = asDocument(await readJson(files, bodyPath));
    if (document === null) continue;
    drafts.push({
      id,
      title: str(entry.title) ?? id,
      updatedAt: str(entry.updatedAt) ?? "",
      document,
    });
    bodies[id] = bodyPath;
  }

  const sources: DraftSources = { manifest: DRAFTS_MANIFEST_PATH, bodies };
  return { drafts, sources };
}
