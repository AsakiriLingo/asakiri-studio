import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { exit } from "node:process";
import Ajv from "ajv/dist/2020.js";

const SCHEMA_DIR = "schemas/asakiri-course/v1";
const COURSE_DIR = "examples/courses/japanese-starter";

const ajv = new Ajv({ allErrors: true, strict: false });

for (const file of await readdir(SCHEMA_DIR)) {
  if (!file.endsWith(".json")) continue;
  const schema = JSON.parse(await readFile(join(SCHEMA_DIR, file), "utf8"));
  ajv.addSchema(schema, file);
}

function validatorFor(file) {
  return ajv.getSchema(file) ?? ajv.compile({ $ref: `${file}#` });
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? collect(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat().filter((path) => path.endsWith(".json"));
}

const manifest = await readJson(join(COURSE_DIR, "project.json"));
const partKinds = new Map();

for (const lessonPath of manifest.lessons ?? []) {
  const lesson = await readJson(join(COURSE_DIR, lessonPath));
  for (const part of lesson.parts ?? []) {
    const body = resolve(dirname(join(COURSE_DIR, lessonPath)), part.content.file);
    partKinds.set(body, part.content.kind);
  }
}

function schemaFor(path) {
  const name = basename(path);
  const relative = path.slice(COURSE_DIR.length + 1);
  if (name === "project.json") return "manifest.schema.json";
  if (relative.startsWith("content/collections/")) return "collection.schema.json";
  if (relative.startsWith("content/records/")) return "record.schema.json";
  if (name === "asset.json") return "asset.schema.json";
  if (name === "lesson.json") return "lesson.schema.json";
  const kind = partKinds.get(resolve(path));
  if (kind === "exercise") return "exercise.schema.json";
  if (kind === "composition") return "composition.schema.json";
  if (kind === "tiptap") return "document.schema.json";
  return null;
}

const problems = [];
let checked = 0;

for (const path of await collect(COURSE_DIR)) {
  const schemaName = schemaFor(path);
  if (schemaName === null) {
    problems.push(`${path}: no schema matches this file`);
    continue;
  }
  const validate = validatorFor(schemaName);
  const data = await readJson(path);
  if (!validate(data)) {
    for (const error of validate.errors ?? []) {
      problems.push(`${path} (${schemaName}) ${error.instancePath || "/"} ${error.message}`);
    }
    continue;
  }
  checked += 1;
}

if (problems.length > 0) {
  console.error(`Schema validation failed:\n  ${problems.join("\n  ")}`);
  exit(1);
}

console.log(`Schemas passed: ${String(checked)} files validated against ${SCHEMA_DIR}.`);
