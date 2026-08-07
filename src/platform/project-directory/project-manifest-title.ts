function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseProjectManifestTitle(text: string): string | null {
  try {
    const manifest: unknown = JSON.parse(text);
    if (!isRecord(manifest) || !isRecord(manifest.project)) {
      return null;
    }

    const title = manifest.project.title;
    if (typeof title !== "string" || title.trim().length === 0) {
      return null;
    }

    return title.trim();
  } catch {
    return null;
  }
}
