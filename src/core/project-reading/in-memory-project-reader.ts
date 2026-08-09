import type { Course, CourseSources } from "@core/course";
import type {
  ContentCollectionSummary,
  ProjectReadErrorCode,
  ProjectReader,
} from "@core/project-reading/project-reader";

const EMPTY_SOURCES: CourseSources = {
  project: "project.json",
  collections: {},
  records: {},
  assets: {},
  lessons: {},
  parts: {},
};

export interface InMemoryProjectReaderSeed {
  readonly contentCollectionsBySession?: Readonly<
    Record<string, readonly ContentCollectionSummary[]>
  >;
  readonly courseBySession?: Readonly<Record<string, Course>>;
  readonly failWithCode?: ProjectReadErrorCode;
}

export function createInMemoryProjectReader(seed: InMemoryProjectReaderSeed = {}): ProjectReader {
  const { contentCollectionsBySession = {}, courseBySession = {}, failWithCode } = seed;

  return {
    listContentCollections(session) {
      if (failWithCode) {
        return Promise.resolve({ status: "failed", code: failWithCode });
      }
      const data = contentCollectionsBySession[session.id] ?? [];
      return Promise.resolve({ status: "ready", data });
    },
    readCourse(session) {
      if (failWithCode) {
        return Promise.resolve({ status: "failed", code: failWithCode });
      }
      const course = courseBySession[session.id];
      if (!course) {
        return Promise.resolve({ status: "failed", code: "unavailable" });
      }
      return Promise.resolve({ status: "ready", data: { course, sources: EMPTY_SOURCES } });
    },
  };
}
