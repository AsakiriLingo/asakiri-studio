import { Extension, type Editor } from "@tiptap/react";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface SearchState {
  readonly query: string;
  readonly active: number;
  readonly decorations: DecorationSet;
}

interface SearchMeta {
  readonly query: string;
  readonly active: number;
}

const searchKey = new PluginKey<SearchState>("richSearch");

const MAX_MATCHES = 500;

function matchRanges(doc: ProseMirrorNode, query: string): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  if (query === "") return ranges;
  const needle = query.toLowerCase();
  doc.descendants((node, pos) => {
    if (ranges.length >= MAX_MATCHES) return false;
    if (!node.isText || node.text === undefined) return undefined;
    const haystack = node.text.toLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1 && ranges.length < MAX_MATCHES) {
      ranges.push({ from: pos + index, to: pos + index + needle.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
    return undefined;
  });
  return ranges;
}

function decorate(doc: ProseMirrorNode, query: string, active: number): DecorationSet {
  const ranges = matchRanges(doc, query);
  if (ranges.length === 0) return DecorationSet.empty;
  return DecorationSet.create(
    doc,
    ranges.map((range, index) =>
      Decoration.inline(range.from, range.to, {
        class: index === active ? "rich-search-match rich-search-active" : "rich-search-match",
      }),
    ),
  );
}

export const SearchHighlight = Extension.create({
  name: "richSearch",

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => ({ query: "", active: 0, decorations: DecorationSet.empty }),
          apply(tr, value): SearchState {
            const meta = tr.getMeta(searchKey) as SearchMeta | undefined;
            if (meta) {
              return {
                query: meta.query,
                active: meta.active,
                decorations: decorate(tr.doc, meta.query, meta.active),
              };
            }
            if (tr.docChanged && value.query !== "") {
              return {
                query: value.query,
                active: value.active,
                decorations: decorate(tr.doc, value.query, value.active),
              };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state)?.decorations ?? null;
          },
        },
      }),
    ];
  },
});

export function applySearch(editor: Editor, query: string, activeIndex: number): number {
  const { state, view } = editor;
  const ranges = matchRanges(state.doc, query);
  const total = ranges.length;
  const active = total === 0 ? -1 : ((activeIndex % total) + total) % total;
  const tr = state.tr.setMeta(searchKey, { query, active } satisfies SearchMeta);
  const target = active >= 0 ? ranges[active] : undefined;
  if (target) {
    tr.setSelection(TextSelection.create(state.doc, target.from, target.to));
  }
  view.dispatch(tr);
  if (target) {
    const { node } = view.domAtPos(target.from);
    const element = node instanceof HTMLElement ? node : node.parentElement;
    element?.scrollIntoView({ block: "center", inline: "nearest" });
  }
  return total;
}
