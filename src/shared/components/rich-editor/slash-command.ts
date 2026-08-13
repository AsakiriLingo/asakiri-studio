import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export interface SlashRange {
  readonly from: number;
  readonly to: number;
}

export interface SlashState {
  readonly query: string;
  readonly range: SlashRange;
  readonly rect: DOMRect;
}

export interface SlashCommandOptions {
  onStateChange: (state: SlashState | null) => void;
}

interface PluginState {
  readonly active: { readonly query: string; readonly range: SlashRange } | null;
}

const slashPluginKey = new PluginKey<PluginState>("slashCommand");

const TRIGGER = /(^|\s)\/([^\s/]*)$/;

function detect(state: EditorState): PluginState {
  const { selection } = state;
  if (!selection.empty) return { active: null };
  const { $from } = selection;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const match = TRIGGER.exec(textBefore);
  if (!match) return { active: null };
  const query = match[2] ?? "";
  const to = $from.pos;
  const from = to - query.length - 1;
  return { active: { query, range: { from, to } } };
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return { onStateChange: () => undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let lastKey = "";
    return [
      new Plugin<PluginState>({
        key: slashPluginKey,
        state: {
          init: () => ({ active: null }),
          apply: (_tr, _value, _oldState, newState) => detect(newState),
        },
        view: () => ({
          update: (view: EditorView) => {
            const pluginState = slashPluginKey.getState(view.state);
            const active = pluginState?.active ?? null;
            if (!active) {
              if (lastKey !== "") {
                lastKey = "";
                options.onStateChange(null);
              }
              return;
            }
            const coords = view.coordsAtPos(active.range.from);
            const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
            const key = `${active.query}:${String(active.range.from)}:${String(Math.round(coords.left))}:${String(Math.round(coords.top))}`;
            if (key === lastKey) return;
            lastKey = key;
            options.onStateChange({ query: active.query, range: active.range, rect });
          },
        }),
      }),
    ];
  },
});
