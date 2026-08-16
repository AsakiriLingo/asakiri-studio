// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  COURSE_FORMAT,
  COURSE_FORMAT_VERSION,
  isLocaleMap,
  parseCourse,
  resolveLocalized,
  withLocale,
} from "@core/course";
import type { CourseFileReader } from "@core/course";

function memoryReader(files: Readonly<Record<string, unknown>>): CourseFileReader {
  return {
    readTextFile: (path) => {
      const file = files[path];
      if (file === undefined) return Promise.reject(new Error(`missing ${path}`));
      return Promise.resolve(JSON.stringify(file));
    },
  };
}

function manifestFor(defaultLocale: string) {
  return {
    format: COURSE_FORMAT,
    formatVersion: COURSE_FORMAT_VERSION,
    project: {
      id: "course_x",
      title: { en: "Japanese Starter", ja: "はじめての日本語" },
      description: { en: "A course", ja: "コース" },
      defaultLocale,
      learningLocales: ["ja"],
    },
    collections: [],
    lessons: ["lessons/one/lesson.json"],
    outline: [{ id: "section_one", title: { en: "Unit one", ja: "ユニット1" }, lessonIds: ["l1"] }],
  };
}

const lesson = {
  id: "l1",
  title: { en: "Practice 猫", ja: "猫の練習" },
  parts: [{ id: "p1", title: "Say it", content: { kind: "exercise", file: "speak.json" } }],
};

const exercise = {
  id: "exercise_speak",
  type: "speaking",
  instruction: { en: "Say this word.", ja: "この単語を言ってください。" },
  prompt: [
    {
      id: "f1",
      role: "primary",
      binding: {
        kind: "literal",
        value: { type: "text", text: { en: "Graded on device.", ja: "端末で採点します。" } },
      },
    },
  ],
  target: { id: "f2", role: "primary", binding: { kind: "literal", value: "猫" } },
  evaluation: { kind: "spoken-response", strictness: "standard" },
};

describe("resolveLocalized", () => {
  it("prefers an exact locale, then the base language, then any entry", () => {
    const value = { en: "Hello", "pt-BR": "Olá" };

    expect(resolveLocalized(value, "en")).toBe("Hello");
    expect(resolveLocalized(value, "pt-BR")).toBe("Olá");
    expect(resolveLocalized({ pt: "Olá" }, "pt-BR")).toBe("Olá");
    expect(resolveLocalized(value, "de")).toBe("Hello");
    expect(resolveLocalized("plain", "de")).toBe("plain");
  });

  it("does not mistake an ordinary object for a locale map", () => {
    expect(isLocaleMap({ alt: "A cat", width: 640 })).toBe(false);
    expect(isLocaleMap({ type: "text", text: "hi" })).toBe(false);
    expect(isLocaleMap({})).toBe(false);
    expect(isLocaleMap({ en: "Hello", ja: "こんにちは" })).toBe(true);
  });
});

describe("parsing a multilingual course", () => {
  it("resolves authored text to the course default locale", async () => {
    const course = await parseCourse(
      memoryReader({
        "project.json": manifestFor("en"),
        "lessons/one/lesson.json": lesson,
        "lessons/one/speak.json": exercise,
      }),
    );

    expect(course.project.title).toBe("Japanese Starter");
    expect(course.outline[0]?.title).toBe("Unit one");
    expect(course.lessons[0]?.title).toBe("Practice 猫");

    const content = course.lessons[0]?.parts[0]?.content;
    if (content?.kind !== "exercise") throw new Error("expected an exercise");
    expect(content.exercise.instruction).toBe("Say this word.");
    expect(content.exercise.prompt[0]?.binding).toEqual({
      kind: "literal",
      value: { type: "text", text: "Graded on device." },
    });
  });

  it("resolves the same course differently when the default locale changes", async () => {
    const course = await parseCourse(
      memoryReader({
        "project.json": manifestFor("ja"),
        "lessons/one/lesson.json": lesson,
        "lessons/one/speak.json": exercise,
      }),
    );

    expect(course.project.title).toBe("はじめての日本語");
    expect(course.lessons[0]?.title).toBe("猫の練習");

    const content = course.lessons[0]?.parts[0]?.content;
    if (content?.kind !== "exercise") throw new Error("expected an exercise");
    expect(content.exercise.instruction).toBe("この単語を言ってください。");
  });

  it("leaves a single-language course as plain strings", async () => {
    const course = await parseCourse(
      memoryReader({
        "project.json": {
          ...manifestFor("en"),
          project: { ...manifestFor("en").project, title: "Plain", description: "Plain" },
        },
        "lessons/one/lesson.json": { ...lesson, title: "Plain lesson" },
        "lessons/one/speak.json": { ...exercise, instruction: "Plain instruction" },
      }),
    );

    expect(course.project.title).toBe("Plain");
    expect(course.lessons[0]?.title).toBe("Plain lesson");
  });
});

describe("withLocale", () => {
  it("updates one locale and keeps the rest", () => {
    expect(withLocale({ en: "Old", ja: "旧" }, "en", "New")).toEqual({ en: "New", ja: "旧" });
  });

  it("returns a plain string when there was no map to preserve", () => {
    expect(withLocale("Old", "en", "New")).toBe("New");
  });
});
