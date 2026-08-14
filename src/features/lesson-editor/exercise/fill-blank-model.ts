import type { BlankSegment } from "@core/course";
import {
  literalText,
  newFragmentId,
  textBinding,
} from "@features/lesson-editor/exercise/fragment-model";

const BLANK_PATTERN = /\{\{[^}]*\}\}/g;

export interface ParsedSentence {
  readonly stem: readonly BlankSegment[];
  readonly blankIds: readonly string[];
}

export function parseSentence(
  sentence: string,
  previousBlankIds: readonly string[],
): ParsedSentence {
  const stem: BlankSegment[] = [];
  const blankIds: string[] = [];
  let cursor = 0;
  let blankIndex = 0;

  const pushText = (text: string) => {
    if (text === "") return;
    stem.push({
      kind: "text",
      fragment: { id: `seg_${String(stem.length)}`, role: "primary", binding: textBinding(text) },
    });
  };

  for (const match of sentence.matchAll(BLANK_PATTERN)) {
    pushText(sentence.slice(cursor, match.index));
    const blankId = previousBlankIds[blankIndex] ?? newFragmentId("blank");
    stem.push({ kind: "blank", id: blankId });
    blankIds.push(blankId);
    blankIndex += 1;
    cursor = match.index + match[0].length;
  }
  pushText(sentence.slice(cursor));

  return { stem, blankIds };
}

export function sentenceFromStem(stem: readonly BlankSegment[]): string {
  return stem
    .map((segment) => (segment.kind === "text" ? literalText(segment.fragment.binding) : "{{}}"))
    .join("");
}
