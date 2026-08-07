import { describe, expect, it } from "vitest";
import type { DirectoryHandleLike } from "@platform/project-location";
import { createBrowserProjectFileReader } from "@platform/project-reading/browser-project-file-reader";
import { createLayoutProjectReader } from "@platform/project-reading/layout-project-reader";
import { runProjectReaderContract } from "@platform/project-reading/project-reader-contract";

function fakeDirectoryHandle(
  files: Readonly<Record<string, string>>,
  prefix = "",
): DirectoryHandleLike {
  return {
    getDirectoryHandle(name) {
      return Promise.resolve(fakeDirectoryHandle(files, prefix ? `${prefix}/${name}` : name));
    },
    getFileHandle(name) {
      const path = prefix ? `${prefix}/${name}` : name;
      const content = files[path];
      if (content === undefined) {
        return Promise.reject(new Error(`NotFoundError: ${path}`));
      }
      return Promise.resolve({
        getFile: () => Promise.resolve({ text: () => Promise.resolve(content) }),
      });
    },
  };
}

runProjectReaderContract("browser", (files) =>
  createLayoutProjectReader(() => createBrowserProjectFileReader(fakeDirectoryHandle(files))),
);

describe("createBrowserProjectFileReader", () => {
  it("traverses nested directory handles to read a file", async () => {
    const fileReader = createBrowserProjectFileReader(
      fakeDirectoryHandle({ "content/collections/vocabulary.json": '{"id":"c"}' }),
    );

    expect(await fileReader.readTextFile("content/collections/vocabulary.json")).toBe('{"id":"c"}');
  });

  it("rejects paths outside the selected project", async () => {
    const fileReader = createBrowserProjectFileReader(fakeDirectoryHandle({}));

    await expect(fileReader.readTextFile("../outside.json")).rejects.toThrow(
      "Invalid project-relative path",
    );
  });
});
