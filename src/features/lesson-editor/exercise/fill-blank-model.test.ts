import { describe, expect, it } from "vitest";
import { parseSentence, sentenceFromStem } from "@features/lesson-editor/exercise/fill-blank-model";

describe("fill-blank sentence model", () => {
  it("splits text runs and blanks into stem segments", () => {
    const { stem, blankIds } = parseSentence("これは {{}} です。", []);

    expect(stem.map((segment) => segment.kind)).toEqual(["text", "blank", "text"]);
    expect(blankIds).toHaveLength(1);
  });

  it("round-trips a multi-blank sentence back to its source string", () => {
    const sentence = "A {{}} B {{}} C";
    const { stem } = parseSentence(sentence, []);
    expect(sentenceFromStem(stem)).toBe(sentence);
  });

  it("reuses previous blank ids by position so answers stay attached", () => {
    const { blankIds } = parseSentence("{{}} and {{}}", ["blank_keep"]);
    expect(blankIds[0]).toBe("blank_keep");
    expect(blankIds[1]).not.toBe("blank_keep");
  });

  it("produces no blanks for a sentence without markers", () => {
    const { stem, blankIds } = parseSentence("no blanks here", []);
    expect(blankIds).toEqual([]);
    expect(stem).toHaveLength(1);
  });
});
