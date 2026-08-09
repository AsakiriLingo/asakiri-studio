import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import { AudioView, ContentRecordView, VideoView } from "@shared/components/rich-editor/node-views";

export const ContentRecord = Node.create({
  name: "contentRecord",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      binding: { default: null },
      presentation: { default: null },
      label: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-content-record]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-content-record": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ContentRecordView);
  },
});

const mediaAttributes = {
  addAttributes() {
    return {
      src: { default: null },
      label: { default: null },
      assetId: { default: null },
    };
  },
};

export const AudioNode = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  ...mediaAttributes,
  parseHTML() {
    return [{ tag: "div[data-audio]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-audio": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AudioView);
  },
});

export const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  ...mediaAttributes,
  parseHTML() {
    return [{ tag: "div[data-video]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-video": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});
