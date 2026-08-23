import type { Course, CourseSources } from "@core/course";
import type { Draft } from "@core/drafts";
import type {
  ContentCollectionSummary,
  ProjectReadErrorCode,
  ProjectReader,
} from "@core/project-reading/project-reader";

const DRAFTS_MANIFEST_PATH = ".asakiri/drafts/drafts.json";

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
  readonly draftsBySession?: Readonly<Record<string, readonly Draft[]>>;
  readonly failWithCode?: ProjectReadErrorCode;
}

export function createInMemoryProjectReader(seed: InMemoryProjectReaderSeed = {}): ProjectReader {
  const {
    contentCollectionsBySession = {},
    courseBySession = {},
    draftsBySession = {},
    failWithCode,
  } = seed;

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
    readDrafts(session) {
      if (failWithCode) {
        return Promise.resolve({ status: "failed", code: failWithCode });
      }
      const drafts = draftsBySession[session.id] ?? [];
      return Promise.resolve({
        status: "ready",
        data: { drafts, sources: { manifest: DRAFTS_MANIFEST_PATH, bodies: {} } },
      });
    },
  };
}
