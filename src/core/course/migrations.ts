import {
  assertReadableVersion,
  COURSE_FORMAT_VERSION,
  readFormatVersion,
  withFormatFirst,
  type CourseFileKind,
} from "@core/course/format";

export interface MigrationStep {
  readonly to: number;
  readonly summary: string;
  apply(kind: CourseFileKind, data: Record<string, unknown>): Record<string, unknown>;
}

export const MIGRATIONS: readonly MigrationStep[] = [
  {
    to: 1,
    summary: "Stamp the canonical format envelope on every file",
    apply: (_kind, data) => withFormatFirst(data),
  },
];

export interface MigrationOutcome {
  readonly data: Record<string, unknown>;
  readonly from: number;
  readonly migrated: boolean;
}

export function migrateFile(
  kind: CourseFileKind,
  data: Record<string, unknown>,
  context: string,
): MigrationOutcome {
  const from = readFormatVersion(data, context);
  assertReadableVersion(from, context);

  if (from === COURSE_FORMAT_VERSION) {
    return { data, from, migrated: false };
  }

  const migrated = MIGRATIONS.filter((step) => step.to > from).reduce(
    (carry, step) => step.apply(kind, carry),
    data,
  );

  return { data: migrated, from, migrated: true };
}
