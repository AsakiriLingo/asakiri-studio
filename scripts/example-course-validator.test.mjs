// @vitest-environment node

import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { validateExampleCourse } from "./example-course-validator.mjs";

const fixtureRoot = fileURLToPath(new URL("../examples/courses/japanese-starter", import.meta.url));
const temporaryRoots = [];

async function cloneFixture() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "asakiri-course-validator-"));
  const courseRoot = join(temporaryRoot, "course");
  temporaryRoots.push(temporaryRoot);
  await cp(fixtureRoot, courseRoot, { recursive: true });
  return courseRoot;
}

async function mutateJson(courseRoot, relativePath, mutate) {
  const path = join(courseRoot, relativePath);
  const data = JSON.parse(await readFile(path, "utf8"));
  mutate(data);
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("validateExampleCourse", () => {
  it("accepts the checked-in fixture", async () => {
    const result = await validateExampleCourse(fixtureRoot);

    expect(result.errors).toEqual([]);
    expect(result.summary).toEqual({
      assets: 6,
      collections: 2,
      lessons: 9,
      placeholderAssets: 5,
      records: 12,
    });
  });

  it("rejects values that violate field cardinality", async () => {
    const courseRoot = await cloneFixture();
    await mutateJson(courseRoot, "content/records/cat.json", (record) => {
      record.fields.field_english = { kind: "list", items: [] };
    });

    const result = await validateExampleCourse(courseRoot);

    expect(result.errors).toContain(
      "record_cat.field_english has cardinality one but stores a list",
    );
  });

  it("rejects duplicate repeated-item IDs", async () => {
    const courseRoot = await cloneFixture();
    await mutateJson(courseRoot, "content/records/cat.json", (record) => {
      record.fields.field_pronunciations.items[1].id =
        record.fields.field_pronunciations.items[0].id;
    });

    const result = await validateExampleCourse(courseRoot);

    expect(result.errors).toContain(
      "record_cat.field_pronunciations contains duplicate item id: pronunciation_cat_ja",
    );
  });

  it("rejects broken explicit bindings", async () => {
    const courseRoot = await cloneFixture();
    await mutateJson(courseRoot, "lessons/cat-rich-media/composition.json", (composition) => {
      composition.blocks[1].binding.itemId = "missing_image";
    });

    const result = await validateExampleCourse(courseRoot);

    expect(
      result.errors.some((error) =>
        error.includes("references missing item missing_image on record_cat.field_images"),
      ),
    ).toBe(true);
  });

  it("rejects unsupported format versions", async () => {
    const courseRoot = await cloneFixture();
    await mutateJson(courseRoot, "project.json", (project) => {
      project.formatVersion = "99.0";
    });

    const result = await validateExampleCourse(courseRoot);

    expect(result.errors).toContain("unsupported project formatVersion: 99.0");
  });

  it("loads records from manifest-declared nested shards", async () => {
    const courseRoot = await cloneFixture();
    const oldPath = join(courseRoot, "content/records/cat.json");
    const newPath = join(courseRoot, "content/records/ca/cat.json");
    await mkdir(dirname(newPath), { recursive: true });
    await rename(oldPath, newPath);
    await mutateJson(courseRoot, "content/collections/vocabulary.json", (collection) => {
      collection.recordFiles[0] = "../records/ca/cat.json";
    });

    const result = await validateExampleCourse(courseRoot);

    expect(result.errors).toEqual([]);
    expect(result.summary.records).toBe(12);
  });
});
