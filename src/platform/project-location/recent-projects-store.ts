export interface RecentProjectEntry {
  readonly id: string;
  readonly name: string;
  readonly locationLabel: string;
  readonly rootPath: string;
}

const STORAGE_KEY = "asakiri-recent-projects";
const MAX_ENTRIES = 8;

function isEntry(value: unknown): value is RecentProjectEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.locationLabel === "string" &&
    typeof record.rootPath === "string"
  );
}

export class RecentProjectsStore {
  list(): RecentProjectEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isEntry);
    } catch {
      return [];
    }
  }

  get(id: string): RecentProjectEntry | null {
    return this.list().find((entry) => entry.id === id) ?? null;
  }

  remember(entry: RecentProjectEntry): void {
    const next = [entry, ...this.list().filter((item) => item.rootPath !== entry.rootPath)].slice(
      0,
      MAX_ENTRIES,
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable; recents are best-effort.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      return;
    }
  }
}
