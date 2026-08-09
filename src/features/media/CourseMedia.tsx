import { Button } from "@shared/components/button";
import { Icon, type IconName } from "@shared/components/icon";
import { PanelHeader } from "@shared/components/panel";
import { Status } from "@shared/components/status";
import { WorkHeader, WorkInner } from "@shared/components/work-surface";
import styles from "@features/media/CourseMedia.module.css";

interface MediaFile {
  readonly id: string;
  readonly name: string;
  readonly kind: "Image" | "Audio" | "Video";
  readonly icon: IconName;
  readonly mime: string;
  readonly usedBy: string;
}

const FILES: readonly MediaFile[] = [
  {
    id: "cat-png",
    name: "cat.png",
    kind: "Image",
    icon: "image",
    mime: "image/png",
    usedBy: "Used by Vocabulary: 猫",
  },
  {
    id: "neko-ja-mp3",
    name: "neko-ja.mp3",
    kind: "Audio",
    icon: "audio",
    mime: "audio/mpeg",
    usedBy: "Used by Vocabulary: 猫",
  },
  {
    id: "cat-en-mp3",
    name: "cat-en.mp3",
    kind: "Audio",
    icon: "audio",
    mime: "audio/mpeg",
    usedBy: "Used by Vocabulary: 猫",
  },
];

export function CourseMedia() {
  return (
    <WorkInner>
      <WorkHeader
        title="Media"
        description="Manage the local images, audio, and video that content records and lessons reference."
        actions={
          <Button>
            <Icon name="plus" size={18} />
            Import media
          </Button>
        }
      />

      <section aria-labelledby="media-title">
        <PanelHeader
          title="Project media"
          titleId="media-title"
          description="3 files · stored inside this project"
        />
        <div className={styles.list}>
          {FILES.map((file) => (
            <div key={file.id} className={styles.row}>
              <span className={styles.kind}>
                <Icon name={file.icon} size={18} />
              </span>
              <span>
                <span className={styles.rowTitle}>{file.name}</span>
                <span className={styles.meta}>
                  <span>{file.kind}</span>
                  <span>{file.mime}</span>
                  <span>{file.usedBy}</span>
                </span>
              </span>
              <Status>Available</Status>
            </div>
          ))}
        </div>
      </section>
    </WorkInner>
  );
}
