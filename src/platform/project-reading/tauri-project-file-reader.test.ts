import { describe, expect, it } from "vitest";
import { createLayoutProjectReader } from "@platform/project-reading/layout-project-reader";
import { runProjectReaderContract } from "@platform/project-reading/project-reader-contract";
import { createTauriProjectFileReader } from "@platform/project-reading/tauri-project-file-reader";

function tauriReadTextFile(rootPath: string, files: Readonly<Record<string, string>>) {
  const prefix = `${rootPath}/`;
  return (absolutePath: string): Promise<string> => {
    const relativePath = absolutePath.startsWith(prefix)
      ? absolutePath.slice(prefix.length)
      : undefined;
    const content = relativePath === undefined ? undefined : files[relativePath];
    return content === undefined
      ? Promise.reject(new Error(`ENOENT: ${absolutePath}`))
      : Promise.resolve(content);
  };
}

runProjectReaderContract("tauri", (files) =>
  createLayoutProjectReader(() =>
    createTauriProjectFileReader({
      rootPath: "/root",
      readTextFile: tauriReadTextFile("/root", files),
    }),
  ),
);

describe("createTauriProjectFileReader", () => {
  it("resolves project-relative paths against the root path", async () => {
    const reads: string[] = [];
    const fileReader = createTauriProjectFileReader({
      rootPath: "/Users/me/courses/japanese-starter/",
      readTextFile: (path) => {
        reads.push(path);
        return Promise.resolve("{}");
      },
    });

    await fileReader.readTextFile("content/collections/vocabulary.json");

    expect(reads).toEqual([
      "/Users/me/courses/japanese-starter/content/collections/vocabulary.json",
    ]);
  });

  it("rejects paths outside the selected project", async () => {
    const fileReader = createTauriProjectFileReader({
      rootPath: "/Users/me/courses/japanese-starter",
      readTextFile: () => Promise.resolve("{}"),
    });

    await expect(fileReader.readTextFile("../outside.json")).rejects.toThrow(
      "Invalid project-relative path",
    );
  });
});
