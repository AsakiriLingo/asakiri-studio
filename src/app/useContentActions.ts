import type { Collection, ContentRecord } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import type { SpreadsheetImportRequest } from "@features/import";
import type { AppServices } from "@app/services";
import { WRITE_UNAVAILABLE } from "@app/course-state";
import type { CourseStateStore } from "@app/useCourseState";

const IMPORT_BATCH = 50;

export interface ContentActions {
  readonly saveRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly addRecord: (record: ContentRecord) => Promise<ProjectWriteResult>;
  readonly deleteRecord: (recordId: string) => Promise<ProjectWriteResult>;
  readonly addCollection: (collection: Collection) => Promise<ProjectWriteResult>;
  readonly updateCollection: (collection: Collection) => Promise<ProjectWriteResult>;
  readonly deleteCollection: (collectionId: string) => Promise<ProjectWriteResult>;
  readonly commitSpreadsheet: (
    request: SpreadsheetImportRequest,
    onProgress: (written: number) => void,
  ) => Promise<ProjectWriteResult>;
}

export function useContentActions(services: AppServices, store: CourseStateStore): ContentActions {
  const saveRecord = (record: ContentRecord): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const path = sources.records[record.id];
      if (path === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.updateRecord(session, path, record);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            records: current.course.records.map((entry) =>
              entry.id === record.id ? record : entry,
            ),
          },
        }));
      }
      return result;
    });

  const addRecord = (record: ContentRecord): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const collectionPath = sources.collections[record.collectionId];
      if (collectionPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const recordPath = `content/records/${record.id}.json`;
      const result = await services.writer.createRecord(
        session,
        collectionPath,
        recordPath,
        record,
      );
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, records: [...current.course.records, record] },
          sources: {
            ...current.sources,
            records: { ...current.sources.records, [record.id]: recordPath },
          },
        }));
      }
      return result;
    });

  const deleteRecord = (recordId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const recordPath = sources.records[recordId];
      const record = course.records.find((entry) => entry.id === recordId);
      if (recordPath === undefined || !record) {
        return WRITE_UNAVAILABLE;
      }
      const collectionPath = sources.collections[record.collectionId];
      if (collectionPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.deleteRecord(session, collectionPath, recordPath);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            records: current.course.records.filter((entry) => entry.id !== recordId),
          },
        }));
      }
      return result;
    });

  const addCollection = (collection: Collection): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, apply }) => {
      const collectionPath = `content/collections/${collection.id}.json`;
      const result = await services.writer.createCollection(session, collectionPath, collection);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            collections: [...current.course.collections, collection],
          },
          sources: {
            ...current.sources,
            collections: { ...current.sources.collections, [collection.id]: collectionPath },
          },
        }));
      }
      return result;
    });

  const updateCollection = (collection: Collection): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const collectionPath = sources.collections[collection.id];
      if (collectionPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.updateCollection(session, collectionPath, collection);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            collections: current.course.collections.map((entry) =>
              entry.id === collection.id ? collection : entry,
            ),
          },
        }));
      }
      return result;
    });

  const deleteCollection = (collectionId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const collectionPath = sources.collections[collectionId];
      if (collectionPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const recordIds = course.records
        .filter((entry) => entry.collectionId === collectionId)
        .map((entry) => entry.id);
      const recordPaths = recordIds
        .map((id) => sources.records[id])
        .filter((path): path is string => path !== undefined);
      const result = await services.writer.deleteCollection(session, collectionPath, recordPaths);
      if (result.status === "saved") {
        const removed = new Set(recordIds);
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            collections: current.course.collections.filter((entry) => entry.id !== collectionId),
            records: current.course.records.filter((entry) => !removed.has(entry.id)),
          },
        }));
      }
      return result;
    });

  const commitSpreadsheet = (
    request: SpreadsheetImportRequest,
    onProgress: (written: number) => void,
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      let collection =
        course.collections.find((entry) => entry.id === request.collectionId) ?? null;
      let collectionPath = collection ? sources.collections[collection.id] : undefined;

      if (collection === null) {
        collection = {
          id: `collection_${crypto.randomUUID()}`,
          name: request.collectionName,
          fields: request.fields.map((field) => field.definition),
        };
        collectionPath = `content/collections/${collection.id}.json`;
        const created = await services.writer.createCollection(session, collectionPath, collection);
        if (created.status !== "saved") return created;
      } else if (collectionPath !== undefined) {
        const added = request.fields
          .filter((field) => field.isNew)
          .map((field) => field.definition);
        if (added.length > 0) {
          collection = { ...collection, fields: [...collection.fields, ...added] };
          const updated = await services.writer.updateCollection(
            session,
            collectionPath,
            collection,
          );
          if (updated.status !== "saved") return updated;
        }
      }

      if (collectionPath === undefined) return WRITE_UNAVAILABLE;

      const created = request.created.map((record) => ({
        path: `content/records/${record.id}.json`,
        record: { ...record, collectionId: collection.id },
      }));

      let written = 0;
      for (let index = 0; index < created.length; index += IMPORT_BATCH) {
        const batch = created.slice(index, index + IMPORT_BATCH);
        const result = await services.writer.createRecords(session, collectionPath, batch);
        if (result.status !== "saved") return result;
        written += batch.length;
        onProgress(written);
      }

      for (const record of request.updated) {
        const path = sources.records[record.id];
        if (path === undefined) continue;
        const result = await services.writer.updateRecord(session, path, record);
        if (result.status !== "saved") return result;
        written += 1;
        onProgress(written);
      }

      const finalCollection = collection;
      const finalCollectionPath = collectionPath;
      apply((current) => ({
        ...current,
        course: {
          ...current.course,
          collections: [
            ...current.course.collections.filter((entry) => entry.id !== finalCollection.id),
            finalCollection,
          ],
          records: [
            ...current.course.records.map(
              (entry) => request.updated.find((record) => record.id === entry.id) ?? entry,
            ),
            ...created.map((entry) => entry.record),
          ],
        },
        sources: {
          ...current.sources,
          collections: {
            ...current.sources.collections,
            [finalCollection.id]: finalCollectionPath,
          },
          records: {
            ...current.sources.records,
            ...Object.fromEntries(created.map((entry) => [entry.record.id, entry.path])),
          },
        },
      }));
      return { status: "saved" };
    });

  return {
    saveRecord,
    addRecord,
    deleteRecord,
    addCollection,
    updateCollection,
    deleteCollection,
    commitSpreadsheet,
  };
}
