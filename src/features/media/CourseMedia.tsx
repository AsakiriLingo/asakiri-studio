import { useMemo } from "react";
import type { Asset, ContentRecord, Course } from "@core/course";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
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
}

export function CourseMedia({ course }: CourseMediaProps) {
  const messages = useMessages();
  const t = messages.media;

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

  return (
    <WorkInner>
      <WorkHeader
        title={t.title}
        description={t.description}
        actions={
          <Button>
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
                    <Icon name={asset.kind} size={18} />
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
                  <Status tone={asset.availability === "ready" ? "default" : "warning"}>
                    {asset.availability === "ready" ? t.available : t.placeholder}
                  </Status>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </WorkInner>
  );
}
