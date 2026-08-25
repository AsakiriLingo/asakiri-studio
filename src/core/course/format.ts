export const COURSE_FORMAT = "asakiri-course";
export const COURSE_FORMAT_VERSION = 2;

export const DRAFT_FORMATS = ["asakiri-example"] as const;

export type CourseFileKind =
  "manifest" | "collection" | "record" | "asset" | "lesson" | "part" | "document";

export class CourseFormatError extends Error {
  readonly version: number;

  constructor(message: string, version: number) {
    super(message);
    this.name = "CourseFormatError";
    this.version = version;
  }
}

function describe(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readFormatVersion(data: unknown, context: string): number {
  if (!isObject(data)) return 0;
  const format = data.format;
  const version = data.formatVersion;

  if (typeof version === "number" && Number.isInteger(version) && version > 0) {
    if (format !== undefined && format !== COURSE_FORMAT) {
      throw new CourseFormatError(`${context} declares an unknown format: ${describe(format)}`, 0);
    }
    return version;
  }

  if (typeof format === "string" && (DRAFT_FORMATS as readonly string[]).includes(format)) {
    return 0;
  }

  if (format !== undefined && format !== COURSE_FORMAT) {
    throw new CourseFormatError(`${context} declares an unknown format: ${describe(format)}`, 0);
  }

  return 0;
}

export function assertReadableVersion(version: number, context: string): void {
  if (version > COURSE_FORMAT_VERSION) {
    throw new CourseFormatError(
      `${context} was written by a newer version of Studio (format version ${String(version)}, this build reads up to ${String(COURSE_FORMAT_VERSION)})`,
      version,
    );
  }
}

export function stampFormat<T extends Record<string, unknown>>(
  data: T,
): T & { format: string; formatVersion: number } {
  return { ...data, format: COURSE_FORMAT, formatVersion: COURSE_FORMAT_VERSION };
}

export function withFormatFirst(data: Record<string, unknown>): Record<string, unknown> {
  const { format: _format, formatVersion: _formatVersion, $comment, ...rest } = data;
  return {
    ...($comment !== undefined ? { $comment } : {}),
    format: COURSE_FORMAT,
    formatVersion: COURSE_FORMAT_VERSION,
    ...rest,
  };
}
