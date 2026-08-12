import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, ContentRecord, Course } from "@core/course";
import type { ProjectWriteResult } from "@core/project-writing";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { useConfirm } from "@shared/components/confirm-dialog";
import { Icon } from "@shared/components/icon";
import { IconButton } from "@shared/components/icon-button";
import { PanelHeader } from "@shared/components/panel";
import { Status } from "@shared/components/status";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/media/CourseMedia.module.css";

function referencedAssetIds(record: ContentRecord): string[] {
  const ids: string[] = [];
  for (const value of Object.values(record.fields)) {
    if (value.kind === "asset") {
      ids.push(value.assetId);
    } else if (value.kind === "list") {
      for (const item of value.items) {
        if (item.kind === "asset") ids.push(item.assetId);
      }
    }
  }
  return ids;
}

export interface CourseMediaProps {
  readonly course: Course;
  readonly onImportMedia: () => Promise<ProjectWriteResult | null>;
  readonly onDeleteAsset: (assetId: string) => Promise<ProjectWriteResult>;
  readonly onLoadPreview: (assetId: string) => Promise<string | null>;
}

export function CourseMedia({
  course,
  onImportMedia,
  onDeleteAsset,
  onLoadPreview,
}: CourseMediaProps) {
  const messages = useMessages();
  const t = messages.media;
  const confirm = useConfirm();
  const [importing, setImporting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "failed">("idle");
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Load an image thumbnail once per asset. A ref keeps the loader current
  // without re-running the effect when unrelated course state changes.
  const loadRef = useRef(onLoadPreview);
  useEffect(() => {
    loadRef.current = onLoadPreview;
  });

  const imageIds = useMemo(
    () =>
      course.assets
        .filter((asset) => asset.kind === "image" && asset.availability === "ready" && asset.file)
        .map((asset) => asset.id),
    [course.assets],
  );

  const requested = useRef<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    for (const id of imageIds) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      void loadRef.current(id).then((url) => {
        if (!cancelled && url) setPreviews((prev) => ({ ...prev, [id]: url }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [imageIds]);

  const kindLabel: Record<Asset["kind"], string> = {
    audio: t.kindAudio,
    image: t.kindImage,
    video: t.kindVideo,
  };

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of course.records) {
      for (const assetId of referencedAssetIds(record)) {
        counts.set(assetId, (counts.get(assetId) ?? 0) + 1);
      }
    }
    return counts;
  }, [course.records]);

  const runImport = () => {
    setImporting(true);
    void onImportMedia()
      .then((result) => {
        // null means the picker was dismissed; leave the status untouched.
        if (result) setSaveState(result.status === "saved" ? "saved" : "failed");
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const removeAsset = (asset: Asset) => {
    const name = asset.file ?? asset.expectedFile ?? asset.label;
    const uses = usage.get(asset.id) ?? 0;
    void confirm({
      title: uses > 0 ? t.inUseTitle : t.confirmDeleteTitle,
      description: uses > 0 ? t.inUseBody(uses, name) : t.confirmDeleteBody(name),
      confirmLabel: t.deleteMedia,
    }).then((ok) => {
      if (!ok) return;
      void onDeleteAsset(asset.id).then((result) => {
        setSaveState(result.status === "saved" ? "saved" : "failed");
      });
    });
  };

  const status = importing ? (
    <Status>{t.importing}</Status>
  ) : saveState === "failed" ? (
    <Status tone="warning">{t.importFailed}</Status>
  ) : null;

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <Button disabled={importing} onClick={runImport}>
            <Icon name="plus" size={18} />
            {t.importMedia}
          </Button>
        }
      />

      <section aria-labelledby="media-title">
        <PanelHeader
          title={t.projectMedia}
          titleId="media-title"
          description={t.storedInside(t.files(course.assets.length))}
          actions={status}
        />
        {course.assets.length === 0 ? (
          <p className={styles.empty}>{t.empty}</p>
        ) : (
          <div className={styles.list}>
            {course.assets.map((asset) => {
              const uses = usage.get(asset.id) ?? 0;
              return (
                <div key={asset.id} className={styles.row}>
                  <span className={styles.kind}>
                    {previews[asset.id] ? (
                      <img
                        className={styles.thumb}
                        src={previews[asset.id]}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Icon name={asset.kind} size={18} />
                    )}
                  </span>
                  <span>
                    <span className={styles.rowTitle}>
                      {asset.file ?? asset.expectedFile ?? asset.label}
                    </span>
                    <span className={styles.meta}>
                      <span>{kindLabel[asset.kind]}</span>
                      <span>{asset.mimeType}</span>
                      <span>{uses === 0 ? t.notReferenced : t.usedBy(uses)}</span>
                    </span>
                  </span>
                  <span className={styles.rowEnd}>
                    <Status tone={asset.availability === "ready" ? "default" : "warning"}>
                      {asset.availability === "ready" ? t.available : t.placeholder}
                    </Status>
                    <IconButton
                      aria-label={messages.common.remove(
                        asset.file ?? asset.expectedFile ?? asset.label,
                      )}
                      size="sm"
                      onClick={() => {
                        removeAsset(asset);
                      }}
                    >
                      <Icon name="trash" size={18} />
                    </IconButton>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </WorkInner>
  );
}
