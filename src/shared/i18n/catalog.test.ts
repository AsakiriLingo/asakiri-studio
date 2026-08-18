// @vitest-environment node

import { describe, expect, it } from "vitest";
import enMessages from "@shared/i18n/en.json";
import esMessages from "@shared/i18n/es.json";
import itMessages from "@shared/i18n/it.json";
import ptMessages from "@shared/i18n/pt.json";
import ruMessages from "@shared/i18n/ru.json";
import jaMessages from "@shared/i18n/ja.json";
import { formatMessage } from "@shared/i18n/format";

const TRANSLATIONS = {
  es: esMessages,
  it: itMessages,
  pt: ptMessages,
  ru: ruMessages,
  ja: jaMessages,
} as const;

interface MessageTree {
  readonly [key: string]: string | MessageTree;
}

function leafPaths(node: MessageTree, prefix: string): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    return typeof value === "string" ? [path] : leafPaths(value, path);
  });
}

function leafAt(node: MessageTree, path: string): string {
  let current: string | MessageTree = node;
  for (const key of path.split(".")) {
    if (typeof current === "string") throw new Error(`no leaf at ${path}`);
    const next: string | MessageTree | undefined = current[key];
    if (next === undefined) throw new Error(`no leaf at ${path}`);
    current = next;
  }
  if (typeof current !== "string") throw new Error(`no leaf at ${path}`);
  return current;
}

function placeholderNames(message: string): string[] {
  const names = new Set<string>();
  for (const match of message.matchAll(/\{(\w+)(?=[,}])/g)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  return [...names].sort();
}

describe.each(Object.entries(TRANSLATIONS))("%s catalog", (_locale, catalog) => {
  it("declares the same keys as the English catalog", () => {
    expect(leafPaths(catalog, "")).toEqual(leafPaths(enMessages, ""));
  });

  it("uses the same placeholders as the English catalog", () => {
    for (const path of leafPaths(enMessages, "")) {
      const expected = placeholderNames(leafAt(enMessages, path));
      expect({ path, names: placeholderNames(leafAt(catalog, path)) }).toEqual({
        path,
        names: expected,
      });
    }
  });
});

describe("formatMessage", () => {
  it("replaces named placeholders", () => {
    expect(formatMessage("en", enMessages.common.pageOf, { current: 2, total: 9 })).toBe(
      "Page 2 of 9",
    );
    expect(formatMessage("ja", jaMessages.common.pageOf, { current: 2, total: 9 })).toBe(
      "9 ページ中 2 ページ",
    );
  });

  it("selects plural branches", () => {
    expect(formatMessage("en", enMessages.media.files, { count: 1 })).toBe("1 file");
    expect(formatMessage("en", enMessages.media.files, { count: 3 })).toBe("3 files");
    expect(formatMessage("ja", jaMessages.media.files, { count: 3 })).toBe("3件のファイル");
  });

  it("formats plurals embedded in longer messages", () => {
    expect(formatMessage("en", enMessages.media.inUseBody, { count: 1, name: "a.png" })).toBe(
      "“a.png” is referenced by 1 record. Delete it anyway?",
    );
    expect(formatMessage("en", enMessages.media.inUseBody, { count: 4, name: "a.png" })).toBe(
      "“a.png” is referenced by 4 records. Delete it anyway?",
    );
  });

  it("selects Russian plural categories", () => {
    const message = "{count, plural, one {# файл} few {# файла} many {# файлов} other {# файла}}";
    expect(formatMessage("ru", message, { count: 1 })).toBe("1 файл");
    expect(formatMessage("ru", message, { count: 3 })).toBe("3 файла");
    expect(formatMessage("ru", message, { count: 5 })).toBe("5 файлов");
    expect(formatMessage("ru", message, { count: 21 })).toBe("21 файл");
  });

  it("leaves unknown placeholders visible", () => {
    expect(formatMessage("en", "Hello {name}", {})).toBe("Hello {name}");
  });
});
