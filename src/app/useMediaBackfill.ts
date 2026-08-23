import { useEffect, useRef } from "react";
import type { AppServices } from "@app/services";
import type { CourseStateStore } from "@app/useCourseState";

interface DigestRequest {
  readonly assetId: string;
  readonly assetPath: string;
  readonly binaryPath: string;
}

export function useMediaBackfill(services: AppServices, store: CourseStateStore): void {
  const doneFor = useRef<string | null>(null);
  const project = store.project;
  const courseState = store.courseState;
  const ready = courseState?.status === "ready";

  useEffect(() => {
    const backfiller = services.assetDigests;
    if (!backfiller || !project || !ready) return;
    if (doneFor.current === project.id) return;
    doneFor.current = project.id;

    void store.withCourse(undefined, async ({ session, course, sources, apply }) => {
      const requests: DigestRequest[] = course.assets.flatMap((asset) => {
        if (asset.file === null || asset.sha256 !== undefined) return [];
        const assetPath = sources.assets[asset.id];
        if (assetPath === undefined) return [];
        const directory = assetPath.slice(0, assetPath.lastIndexOf("/"));
        return [{ assetId: asset.id, assetPath, binaryPath: `${directory}/${asset.file}` }];
      });
      if (requests.length === 0) return;

      const results = await backfiller
        .backfill(
          session,
          requests.map(({ assetPath, binaryPath }) => ({ assetPath, binaryPath })),
        )
        .catch((error: unknown) => {
          console.error("media: failed to backfill asset digests", error);
          return [];
        });
      if (results.length === 0) return;

      const assetIdByPath = new Map(
        requests.map((request) => [request.assetPath, request.assetId]),
      );
      const digestByAssetId = new Map<string, { sha256: string; byteSize: number }>();
      for (const result of results) {
        const assetId = assetIdByPath.get(result.assetPath);
        if (assetId !== undefined) {
          digestByAssetId.set(assetId, { sha256: result.sha256, byteSize: result.byteSize });
        }
      }

      apply((current) => ({
        ...current,
        course: {
          ...current.course,
          assets: current.course.assets.map((asset) => {
            const digest = digestByAssetId.get(asset.id);
            return digest ? { ...asset, sha256: digest.sha256, byteSize: digest.byteSize } : asset;
          }),
        },
      }));
    });
  }, [services, store, project, ready]);
}
