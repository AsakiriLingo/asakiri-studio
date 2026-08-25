import { useCallback } from "react";
import type { Asset, MediaFolder } from "@core/course";
import { foldersAfterDelete, labelForFile, mediaTypeForFile } from "@core/course";
import type { TtsAddResult } from "@features/media";
import type { PickedMediaFile } from "@core/project-media";
import type { ProjectWriteResult } from "@core/project-writing";
import { createProjectSession } from "@core/projects";
import type { AppServices } from "@app/services";
import { WRITE_UNAVAILABLE } from "@app/course-state";
import type { CourseStateStore } from "@app/useCourseState";

export interface MediaActions {
  readonly importMedia: (folderId: string | null) => Promise<ProjectWriteResult | null>;
  readonly importMediaFolder: (folderId: string | null) => Promise<ProjectWriteResult | null>;
  readonly importAssetForField: () => Promise<Asset | null>;
  readonly addRemoteMedia: (
    url: string,
    fileName: string,
    metadata?: Readonly<Record<string, unknown>>,
    folderId?: string | null,
  ) => Promise<Asset | null>;
  readonly addTtsAudio: (
    text: string,
    voice: string,
    fileName: string,
    folderId?: string | null,
  ) => Promise<TtsAddResult>;
  readonly previewTtsVoice: (text: string, voice: string) => Promise<string>;
  readonly addRecording: (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
    folderId?: string | null,
  ) => Promise<Asset | null>;
  readonly renameAsset: (assetId: string, rawName: string) => Promise<ProjectWriteResult>;
  readonly deleteAsset: (assetId: string) => Promise<ProjectWriteResult>;
  readonly loadAssetPreview: (assetId: string) => Promise<string | null>;
  readonly moveAssetToFolder: (
    assetId: string,
    folderId: string | null,
  ) => Promise<ProjectWriteResult>;
  readonly createFolder: (name: string, parentId: string | null) => Promise<string | null>;
  readonly renameFolder: (folderId: string, name: string) => Promise<ProjectWriteResult>;
  readonly deleteFolder: (folderId: string) => Promise<ProjectWriteResult>;
}

export function useMediaActions(services: AppServices, store: CourseStateStore): MediaActions {
  const { project, courseState } = store;
  const ready = project !== null && courseState?.status === "ready";

  const importPickedMedia = (
    picked: readonly PickedMediaFile[],
    metadata?: Readonly<Record<string, unknown>>,
    folderId?: string | null,
  ): Promise<{ readonly assets: readonly Asset[]; readonly allOk: boolean }> =>
    store.withCourse<{ readonly assets: readonly Asset[]; readonly allOk: boolean }>(
      { assets: [], allOk: false },
      async ({ session, apply }) => {
        const imported: { readonly asset: Asset; readonly assetPath: string }[] = [];
        let allOk = true;
        for (const file of picked) {
          const type = mediaTypeForFile(file.name);
          if (!type) {
            allOk = false;
            continue;
          }
          const id = `asset_${crypto.randomUUID()}`;
          const assetDir = `media/assets/${id}`;
          const assetPath = `${assetDir}/asset.json`;
          const asset: Asset = {
            id,
            kind: type.kind,
            label: labelForFile(file.name),
            availability: "ready",
            file: file.name,
            mimeType: type.mimeType,
            ...(folderId ? { folderId } : {}),
            ...(metadata ? { metadata } : {}),
          };
          const result = await services.writer.importAsset(
            session,
            assetPath,
            `${assetDir}/${file.name}`,
            file.path,
            asset,
          );
          if (result.status === "saved") imported.push({ asset, assetPath });
          else allOk = false;
        }

        if (imported.length > 0) {
          apply((current) => ({
            ...current,
            course: {
              ...current.course,
              assets: [...current.course.assets, ...imported.map((entry) => entry.asset)],
            },
            sources: {
              ...current.sources,
              assets: {
                ...current.sources.assets,
                ...Object.fromEntries(imported.map((entry) => [entry.asset.id, entry.assetPath])),
              },
            },
          }));
        }
        return { assets: imported.map((entry) => entry.asset), allOk };
      },
    );

  const importMedia = async (folderId: string | null): Promise<ProjectWriteResult | null> => {
    if (!ready) {
      return WRITE_UNAVAILABLE;
    }
    const picked = await services.mediaPicker.pickMediaFiles();
    if (picked.length === 0) return null;
    const { allOk } = await importPickedMedia(picked, undefined, folderId);
    return allOk ? { status: "saved" } : { status: "failed", code: "unknown" };
  };

  const importMediaFolder = async (folderId: string | null): Promise<ProjectWriteResult | null> => {
    if (!ready) {
      return WRITE_UNAVAILABLE;
    }
    const picked = await services.mediaPicker.pickMediaFolder();
    if (picked.length === 0) return null;
    const { allOk } = await importPickedMedia(picked, undefined, folderId);
    return allOk ? { status: "saved" } : { status: "failed", code: "unknown" };
  };

  const importAssetForField = async (): Promise<Asset | null> => {
    if (!ready) return null;
    const picked = await services.mediaPicker.pickMediaFiles();
    if (picked.length === 0) return null;
    const { assets } = await importPickedMedia(picked.slice(0, 1));
    return assets[0] ?? null;
  };

  const addRemoteMedia = async (
    url: string,
    fileName: string,
    metadata?: Readonly<Record<string, unknown>>,
    folderId?: string | null,
  ): Promise<Asset | null> => {
    if (!ready) return null;
    const picked = await services.mediaSearch.downloadToTemp(url, fileName);
    if (!picked) return null;
    const { assets } = await importPickedMedia([picked], metadata, folderId);
    return assets[0] ?? null;
  };

  const addTtsAudio = async (
    text: string,
    voice: string,
    fileName: string,
    folderId?: string | null,
  ): Promise<TtsAddResult> => {
    if (!ready) {
      return { ok: false, error: "Project is not ready." };
    }
    let picked;
    try {
      picked = await services.tts.synthesizeToTemp(text, voice, fileName);
    } catch (error) {
      return { ok: false, error: String(error) };
    }
    const { assets, allOk } = await importPickedMedia(
      [picked],
      { sourceText: text, ttsVoice: voice },
      folderId,
    );
    const asset = assets[0];
    return allOk && asset
      ? { ok: true, asset }
      : { ok: false, error: "Could not import the generated audio." };
  };

  const previewTtsVoice = (text: string, voice: string): Promise<string> =>
    services.tts.previewVoice(text, voice);

  const addRecording = async (
    bytes: Uint8Array,
    mimeType: string,
    ext: string,
    folderId?: string | null,
  ): Promise<Asset | null> => {
    if (!ready) return null;
    const id = `asset_${crypto.randomUUID()}`;
    const fileName = `recording-${id.slice(-6)}.${ext}`;
    const picked = await services.recording.saveToTemp(fileName, bytes);
    if (!picked) return null;
    return store.withCourse<Asset | null>(null, async ({ session, apply }) => {
      const assetDir = `media/assets/${id}`;
      const assetPath = `${assetDir}/asset.json`;
      const asset: Asset = {
        id,
        kind: "audio",
        label: labelForFile(fileName),
        availability: "ready",
        file: fileName,
        mimeType,
        ...(folderId ? { folderId } : {}),
      };
      const result = await services.writer.importAsset(
        session,
        assetPath,
        `${assetDir}/${fileName}`,
        picked.path,
        asset,
      );
      if (result.status !== "saved") return null;
      apply((current) => ({
        ...current,
        course: { ...current.course, assets: [...current.course.assets, asset] },
        sources: {
          ...current.sources,
          assets: { ...current.sources.assets, [asset.id]: assetPath },
        },
      }));
      return asset;
    });
  };

  const renameAsset = (assetId: string, rawName: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const asset = course.assets.find((entry) => entry.id === assetId);
      const assetPath = sources.assets[assetId];
      if (!asset || assetPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const currentName = asset.file ?? asset.expectedFile ?? "";
      const dot = currentName.lastIndexOf(".");
      const ext = dot > 0 ? currentName.slice(dot) : "";
      const base = rawName
        .trim()
        .replace(/\.[^.]*$/, "")
        .replace(/[/\\:*?"<>|]/g, "")
        .trim();
      if (base === "") return { status: "saved" };
      const nextName = `${base}${ext}`;
      if (nextName === currentName) return { status: "saved" };
      const nextAsset: Asset = {
        ...asset,
        label: labelForFile(nextName),
        ...(asset.file !== null ? { file: nextName } : { expectedFile: nextName }),
      };
      const result = await services.writer.renameAsset(session, assetPath, asset.file, nextAsset);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            assets: current.course.assets.map((entry) =>
              entry.id === assetId ? nextAsset : entry,
            ),
          },
        }));
      }
      return result;
    });

  const deleteAsset = (assetId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, sources, apply }) => {
      const assetPath = sources.assets[assetId];
      if (assetPath === undefined) {
        return WRITE_UNAVAILABLE;
      }
      const result = await services.writer.deleteAsset(session, assetPath);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            assets: current.course.assets.filter((entry) => entry.id !== assetId),
          },
        }));
      }
      return result;
    });

  const applyAssetFolder = (asset: Asset, folderId: string | null): Asset => {
    const { folderId: _omit, ...rest } = asset;
    return folderId === null ? rest : { ...rest, folderId };
  };

  const moveAssetToFolder = (
    assetId: string,
    folderId: string | null,
  ): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const asset = course.assets.find((entry) => entry.id === assetId);
      const assetPath = sources.assets[assetId];
      if (!asset || assetPath === undefined) return WRITE_UNAVAILABLE;
      const nextAsset = applyAssetFolder(asset, folderId);
      const result = await services.writer.moveAssetToFolder(session, assetPath, nextAsset);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            assets: current.course.assets.map((entry) =>
              entry.id === assetId ? nextAsset : entry,
            ),
          },
        }));
      }
      return result;
    });

  const createFolder = (name: string, parentId: string | null): Promise<string | null> =>
    store.withCourse<string | null>(null, async ({ session, course, apply }) => {
      const trimmed = name.trim();
      if (trimmed === "") return null;
      const folder: MediaFolder = { id: `folder_${crypto.randomUUID()}`, name: trimmed, parentId };
      const nextFolders = [...course.mediaFolders, folder];
      const result = await services.writer.writeMediaFolders(session, nextFolders);
      if (result.status !== "saved") return null;
      apply((current) => ({
        ...current,
        course: { ...current.course, mediaFolders: nextFolders },
      }));
      return folder.id;
    });

  const renameFolder = (folderId: string, name: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, apply }) => {
      const trimmed = name.trim();
      if (trimmed === "") return { status: "saved" };
      const nextFolders = course.mediaFolders.map((folder) =>
        folder.id === folderId ? { ...folder, name: trimmed } : folder,
      );
      const result = await services.writer.writeMediaFolders(session, nextFolders);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: { ...current.course, mediaFolders: nextFolders },
        }));
      }
      return result;
    });

  const deleteFolder = (folderId: string): Promise<ProjectWriteResult> =>
    store.withCourse(WRITE_UNAVAILABLE, async ({ session, course, sources, apply }) => {
      const folder = course.mediaFolders.find((entry) => entry.id === folderId);
      if (!folder) return { status: "saved" };
      const parentId = folder.parentId;
      const nextFolders = foldersAfterDelete(course.mediaFolders, folderId);
      const affected = course.assets.filter((entry) => entry.folderId === folderId);
      const moved = new Map<string, Asset>();
      for (const asset of affected) {
        const assetPath = sources.assets[asset.id];
        if (assetPath === undefined) continue;
        const nextAsset = applyAssetFolder(asset, parentId);
        const result = await services.writer.moveAssetToFolder(session, assetPath, nextAsset);
        if (result.status !== "saved") return result;
        moved.set(asset.id, nextAsset);
      }
      const result = await services.writer.writeMediaFolders(session, nextFolders);
      if (result.status === "saved") {
        apply((current) => ({
          ...current,
          course: {
            ...current.course,
            mediaFolders: nextFolders,
            assets: current.course.assets.map((entry) => moved.get(entry.id) ?? entry),
          },
        }));
      }
      return result;
    });

  const loadAssetPreview = useCallback(
    async (assetId: string): Promise<string | null> => {
      if (!project || courseState?.status !== "ready") return null;
      const asset = courseState.course.assets.find((entry) => entry.id === assetId);
      const assetJsonPath = courseState.sources.assets[assetId];
      if (!asset?.file || assetJsonPath === undefined) return null;
      // The binary lives beside the asset.json descriptor.
      const dir = assetJsonPath.split("/").slice(0, -1).join("/");
      const binaryPath = dir ? `${dir}/${asset.file}` : asset.file;
      return services.assetReader.readAssetDataUrl(
        createProjectSession(project),
        binaryPath,
        asset.mimeType,
      );
    },
    [project, courseState, services],
  );

  return {
    importMedia,
    importMediaFolder,
    importAssetForField,
    addRemoteMedia,
    addTtsAudio,
    previewTtsVoice,
    addRecording,
    renameAsset,
    deleteAsset,
    loadAssetPreview,
    moveAssetToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
  };
}
