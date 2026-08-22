import { useEffect, useState } from "react";
import type { TiptapDocument } from "@core/course";
import { TEXT_DOCUMENT_EXTENSIONS } from "@core/documents";
import type { Draft } from "@core/drafts";
import { labelForFile } from "@core/course";
import { createProjectSession, type ProjectDirectory } from "@core/projects";
import { markdownToTiptapChunked } from "@shared/components/rich-editor";
import type { AppServices } from "@app/services";
import type { CourseStateStore } from "@app/useCourseState";

export type DraftUploadPhase = "reading" | "converting";

export interface DraftUploadProgress {
  readonly phase: DraftUploadPhase;
  readonly fraction: number;
}

export interface DraftActions {
  readonly drafts: readonly Draft[];
  readonly uploadDraft: (
    onProgress?: (progress: DraftUploadProgress) => void,
  ) => Promise<string | null>;
  readonly updateDraft: (id: string, document: TiptapDocument) => Promise<boolean>;
  readonly deleteDraft: (id: string) => Promise<boolean>;
}

export function useDrafts(services: AppServices, store: CourseStateStore): DraftActions {
  const [drafts, setDrafts] = useState<readonly Draft[]>([]);
  const [loadedFor, setLoadedFor] = useState<ProjectDirectory | null>(null);
  const project = store.project;

  if (project !== loadedFor) {
    setLoadedFor(project);
    setDrafts([]);
  }

  useEffect(() => {
    if (!project) return;
    const session = createProjectSession(project);
    let cancelled = false;
    void services.reader.readDrafts(session).then((result) => {
      if (cancelled) return;
      setDrafts(result.status === "ready" ? result.data.drafts : []);
    });
    return () => {
      cancelled = true;
    };
  }, [project, services]);

  const uploadDraft = (
    onProgress?: (progress: DraftUploadProgress) => void,
  ): Promise<string | null> =>
    store.withProject<string | null>(null, async (session) => {
      const picked = await services.documents.pickDocument(TEXT_DOCUMENT_EXTENSIONS);
      if (!picked) return null;
      onProgress?.({ phase: "reading", fraction: 0 });
      const read = await services.documents.readDocument(picked.path);
      if (read.status !== "ready") {
        throw new Error(`Could not read the document (${read.code}).`);
      }
      onProgress?.({ phase: "converting", fraction: 0 });
      const document = (await markdownToTiptapChunked(read.document.markdown, (fraction) => {
        onProgress?.({ phase: "converting", fraction });
      })) as unknown as TiptapDocument;
      const id = `draft_${crypto.randomUUID()}`;
      const title = labelForFile(picked.name);
      const updatedAt = new Date().toISOString();
      const result = await services.writer.importDraft(session, { id, title, updatedAt }, document);
      if (result.status !== "saved") {
        throw new Error(`Could not save the draft (${result.code}).`);
      }
      setDrafts((current) => [...current, { id, title, updatedAt, document }]);
      return id;
    });

  const updateDraft = (id: string, document: TiptapDocument): Promise<boolean> =>
    store.withProject(false, async (session) => {
      const updatedAt = new Date().toISOString();
      const result = await services.writer.updateDraft(session, id, document, updatedAt);
      if (result.status !== "saved") return false;
      setDrafts((current) =>
        current.map((draft) => (draft.id === id ? { ...draft, document, updatedAt } : draft)),
      );
      return true;
    });

  const deleteDraft = (id: string): Promise<boolean> =>
    store.withProject(false, async (session) => {
      const result = await services.writer.deleteDraft(session, id);
      if (result.status !== "saved") return false;
      setDrafts((current) => current.filter((draft) => draft.id !== id));
      return true;
    });

  return { drafts, uploadDraft, updateDraft, deleteDraft };
}
