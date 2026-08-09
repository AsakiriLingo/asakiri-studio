import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Icon } from "@shared/components/icon";
import styles from "@shared/components/rich-editor/RichEditor.module.css";

interface ContentRecordAttrs {
  readonly binding: unknown;
  readonly presentation: string | null;
  readonly label: string | null;
}

export function ContentRecordView({ node }: NodeViewProps) {
  const attrs = node.attrs as ContentRecordAttrs;
  return (
    <NodeViewWrapper as="span" className={styles.binding} data-drag-handle>
      <Icon name="content" size={16} aria-hidden="true" />
      <span className={styles.bindingName}>{attrs.label ?? "Content record"}</span>
      {attrs.presentation ? <small>{attrs.presentation}</small> : null}
    </NodeViewWrapper>
  );
}

interface MediaAttrs {
  readonly src: string | null;
  readonly label: string | null;
  readonly assetId: string | null;
}

function MediaView({
  node,
  kind,
}: {
  readonly node: NodeViewProps["node"];
  readonly kind: "audio" | "video";
}) {
  const attrs = node.attrs as MediaAttrs;
  const meta = attrs.src ?? attrs.assetId ?? "Not linked";
  return (
    <NodeViewWrapper className={styles.media} data-drag-handle>
      <span className={styles.mediaBadge}>
        <Icon name={kind} size={18} aria-hidden="true" />
      </span>
      <span>
        <span className={styles.mediaLabel}>
          {attrs.label ?? (kind === "audio" ? "Audio" : "Video")}
        </span>
        <span className={styles.mediaMeta}> {meta}</span>
      </span>
    </NodeViewWrapper>
  );
}

export function AudioView({ node }: NodeViewProps) {
  return <MediaView node={node} kind="audio" />;
}

export function VideoView({ node }: NodeViewProps) {
  return <MediaView node={node} kind="video" />;
}
