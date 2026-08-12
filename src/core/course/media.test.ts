import { describe, expect, it } from "vitest";
import { labelForFile, mediaTypeForFile } from "@core/course/media";

describe("mediaTypeForFile", () => {
  it("maps known extensions to a kind and mime type, case-insensitively", () => {
    expect(mediaTypeForFile("cat.PNG")).toEqual({ kind: "image", mimeType: "image/png" });
    expect(mediaTypeForFile("intro.mp3")).toEqual({ kind: "audio", mimeType: "audio/mpeg" });
    expect(mediaTypeForFile("clip.webm")).toEqual({ kind: "video", mimeType: "video/webm" });
  });

  it("returns null for unsupported or extension-less files", () => {
    expect(mediaTypeForFile("notes.txt")).toBeNull();
    expect(mediaTypeForFile("README")).toBeNull();
  });
});

describe("labelForFile", () => {
  it("drops the extension and keeps the base name", () => {
    expect(labelForFile("Cat Illustration.png")).toBe("Cat Illustration");
  });

  it("keeps dotfiles and extension-less names intact", () => {
    expect(labelForFile(".gitignore")).toBe(".gitignore");
    expect(labelForFile("cover")).toBe("cover");
  });
});
