import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Youtube } from "@tiptap/extension-youtube";
import { TableKit } from "@tiptap/extension-table";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { AudioNode, ContentRecord, VideoNode } from "@shared/components/rich-editor/nodes";
import { ImageView } from "@shared/components/rich-editor/node-views";

export const ImageWithAsset = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: { default: null },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

export const YoutubeWithFallback = Youtube.extend({
  renderHTML(props) {
    const src: unknown = props.HTMLAttributes.src;
    if (typeof src === "string" && src !== "") {
      return this.parent?.(props) ?? ["div", { "data-youtube-video": "" }];
    }
    return ["div", { "data-youtube-video": "", "data-missing-src": "" }, "YouTube"];
  },
});

export const baseExtensions = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  ImageWithAsset,
  YoutubeWithFallback.configure({ nocookie: true }),
  TableKit.configure({ table: { resizable: false } }),
  ContentRecord,
  AudioNode,
  VideoNode,
];
