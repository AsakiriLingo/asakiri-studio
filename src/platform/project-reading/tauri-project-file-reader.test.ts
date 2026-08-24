import { describe, expect, it } from "vitest";
import {
  createLayoutProjectReader,
  ProjectFileNotFoundError,
} from "@platform/project-reading/layout-project-reader";
import { runProjectReaderContract } from "@platform/project-reading/project-reader-contract";
import { createTauriProjectFileReader } from "@platform/project-reading/tauri-project-file-reader";

function tauriReadCourseFile(files: Readonly<Record<string, string>>) {
  return (_rootPath: string, relativePath: string): Promise<string> => {
    const content = files[relativePath];
    return content === undefined
      ? Promise.reject(new Error(`ENOENT: ${relativePath}`))
      : Promise.resolve(content);
  };
}

runProjectReaderContract("tauri", (files) =>
  createLayoutProjectReader(() =>
    createTauriProjectFileReader({
      rootPath: "/root",
      readCourseFile: tauriReadCourseFile(files),
    }),
  ),
);

describe("createTauriProjectFileReader", () => {
  it("passes the root and relative path through to the command", async () => {
    const reads: { rootPath: string; relativePath: string }[] = [];
    const fileReader = createTauriProjectFileReader({
      rootPath: "/Users/me/courses/japanese-starter",
      readCourseFile: (rootPath, relativePath) => {
        reads.push({ rootPath, relativePath });
        return Promise.resolve("{}");
      },
    });

    await fileReader.readTextFile("content/collections/vocabulary.json");

    expect(reads).toEqual([
      {
        rootPath: "/Users/me/courses/japanese-starter",
        relativePath: "content/collections/vocabulary.json",
      },
    ]);
  });

  it("translates a notFound rejection into a ProjectFileNotFoundError", async () => {
    const fileReader = createTauriProjectFileReader({
      rootPath: "/Users/me/courses/japanese-starter",
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      readCourseFile: () => Promise.reject("notFound"),
    });

    await expect(fileReader.readTextFile("project.json")).rejects.toBeInstanceOf(
      ProjectFileNotFoundError,
    );
  });

  it("rejects paths outside the selected project", async () => {
    const fileReader = createTauriProjectFileReader({
      rootPath: "/Users/me/courses/japanese-starter",
      readCourseFile: () => Promise.resolve("{}"),
    });

    await expect(fileReader.readTextFile("../outside.json")).rejects.toThrow(
      "Invalid project-relative path",
    );
  });
});
