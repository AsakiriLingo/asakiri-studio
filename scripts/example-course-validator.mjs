import { access, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const SUPPORTED_FORMAT = "asakiri-example";
const SUPPORTED_VERSION = "0.1-draft";
const FIELD_KINDS = new Set(["asset", "text"]);
const CARDINALITIES = new Set(["one", "many"]);
const ASSET_KINDS = new Set(["audio", "image", "video"]);
const BINDING_KINDS = new Set(["asset", "field", "item", "literal", "record"]);

export async function validateExampleCourse(courseRoot) {
  const root = resolve(courseRoot);
  const errors = [];

  function report(message) {
    errors.push(message);
  }

  async function pathExists(path) {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  function resolveInsideCourse(base, referencedPath, context) {
    if (typeof referencedPath !== "string" || referencedPath.length === 0) {
      report(`${context} must be a non-empty relative path`);
      return null;
    }

    const absolutePath = resolve(base, referencedPath);
    if (absolutePath !== root && !absolutePath.startsWith(`${root}${sep}`)) {
      report(`${context} escapes the course directory: ${referencedPath}`);
      return null;
    }
    return absolutePath;
  }

  async function readJson(path, context = relative(root, path)) {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
      report(
        `${context} is not readable JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async function loadReferencedJson(base, paths, context) {
    if (!Array.isArray(paths)) {
      report(`${context} must be an array of file paths`);
      return [];
    }

    const seenPaths = new Set();
    const loaded = [];
    for (const referencedPath of paths) {
      const path = resolveInsideCourse(base, referencedPath, context);
      if (!path) continue;
      if (seenPaths.has(path)) {
        report(`${context} contains duplicate path: ${referencedPath}`);
        continue;
      }
      seenPaths.add(path);
      const data = await readJson(path);
      if (data) loaded.push({ data, file: path });
    }
    return loaded;
  }

  function indexById(entries, kind) {
    const index = new Map();
    for (const { data, file } of entries) {
      const location = relative(root, file);
      if (!data?.id || typeof data.id !== "string") {
        report(`${location}: ${kind} is missing a string id`);
        continue;
      }
      if (index.has(data.id)) {
        report(`duplicate ${kind} id: ${data.id}`);
        continue;
      }
      index.set(data.id, { data, file });
    }
    return index;
  }

  const projectPath = resolve(root, "project.json");
  const project = await readJson(projectPath, "project.json");
  if (!project) return emptyResult(errors);

  if (project.format !== SUPPORTED_FORMAT) {
    report(`unsupported project format: ${String(project.format)}`);
  }
  if (project.formatVersion !== SUPPORTED_VERSION) {
    report(`unsupported project formatVersion: ${String(project.formatVersion)}`);
  }

  const collectionsWithFiles = await loadReferencedJson(
    root,
    project.collections,
    "project.collections",
  );
  const assetsWithFiles = await loadReferencedJson(
    root,
    project.assets,
    "project.assets",
  );
  const lessonsWithFiles = await loadReferencedJson(
    root,
    project.lessons,
    "project.lessons",
  );

  const recordGroups = await Promise.all(
    collectionsWithFiles.map(({ data: collection, file }) =>
      loadReferencedJson(
        dirname(file),
        collection.recordFiles,
        `${collection.id ?? relative(root, file)}.recordFiles`,
      ),
    ),
  );
  const recordsWithFiles = recordGroups.flat();

  const collections = indexById(collectionsWithFiles, "collection");
  const records = indexById(recordsWithFiles, "record");
  const assets = indexById(assetsWithFiles, "asset");
  const lessons = indexById(lessonsWithFiles, "lesson");

  function validateCollection(collection, file) {
    const context = collection.id ?? relative(root, file);
    if (!Array.isArray(collection.fields)) {
      report(`${context}.fields must be an array`);
      return new Map();
    }

    const fields = new Map();
    for (const field of collection.fields) {
      if (!field?.id || typeof field.id !== "string") {
        report(`${context} contains a field without a string id`);
        continue;
      }
      if (fields.has(field.id)) {
        report(`${context} contains duplicate field id: ${field.id}`);
        continue;
      }
      fields.set(field.id, field);

      if (!FIELD_KINDS.has(field.kind)) {
        report(`${context}.${field.id} has unsupported kind: ${String(field.kind)}`);
      }
      if (!CARDINALITIES.has(field.cardinality)) {
        report(
          `${context}.${field.id} has unsupported cardinality: ${String(field.cardinality)}`,
        );
      }
      if (
        field.kind === "asset" &&
        (!field.assetKind || !ASSET_KINDS.has(field.assetKind))
      ) {
        report(`${context}.${field.id} must declare a supported assetKind`);
      }
      if (field.kind !== "asset" && "assetKind" in field) {
        report(`${context}.${field.id} may declare assetKind only for asset fields`);
      }
      if (typeof field.required !== "boolean") {
        report(`${context}.${field.id}.required must be boolean`);
      }
    }
    return fields;
  }

  const collectionFields = new Map();
  for (const [collectionId, { data, file }] of collections) {
    collectionFields.set(collectionId, validateCollection(data, file));
  }

  let placeholderAssets = 0;
  for (const [assetId, { data: asset, file }] of assets) {
    if (!ASSET_KINDS.has(asset.kind)) {
      report(`${assetId} has unsupported asset kind: ${String(asset.kind)}`);
    }
    if (asset.availability === "ready") {
      const mediaPath = resolveInsideCourse(dirname(file), asset.file, `${assetId}.file`);
      if (!mediaPath || !(await pathExists(mediaPath))) {
        report(`${assetId} is ready but its local file is missing`);
      }
    } else if (asset.availability === "placeholder") {
      placeholderAssets += 1;
      if (asset.file !== null || typeof asset.expectedFile !== "string") {
        report(`${assetId} placeholder must have file: null and expectedFile`);
      }
    } else {
      report(`${assetId} has unknown availability: ${String(asset.availability)}`);
    }
  }

  function validateAssetReference(assetId, expectedKind, context) {
    if (typeof assetId !== "string") {
      report(`${context}.assetId must be a string`);
      return;
    }
    const assetEntry = assets.get(assetId);
    if (!assetEntry) {
      report(`${context} references missing asset: ${assetId}`);
      return;
    }
    if (expectedKind && assetEntry.data.kind !== expectedKind) {
      report(
        `${context} requires ${expectedKind} but ${assetId} is ${String(assetEntry.data.kind)}`,
      );
    }
  }

  function validateAtomicValue(value, definition, context, requiresItemId) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      report(`${context} must be an object`);
      return;
    }
    if (requiresItemId && (typeof value.id !== "string" || value.id.length === 0)) {
      report(`${context}.id must be a non-empty string`);
    }

    if (definition.kind === "text") {
      if (value.kind !== "text" || typeof value.value !== "string") {
        report(`${context} must store a text value`);
      }
      return;
    }

    if (definition.kind === "asset") {
      if (value.kind !== "asset") {
        report(`${context} must store an asset value`);
        return;
      }
      validateAssetReference(value.assetId, definition.assetKind, context);
    }
  }

  function validateFieldValue(value, definition, context) {
    if (definition.cardinality === "one") {
      if (value?.kind === "list") {
        report(`${context} has cardinality one but stores a list`);
        return;
      }
      validateAtomicValue(value, definition, context, false);
      return;
    }

    if (!value || value.kind !== "list" || !Array.isArray(value.items)) {
      report(`${context} has cardinality many and must store a list of items`);
      return;
    }

    const itemIds = new Set();
    value.items.forEach((item, index) => {
      const itemContext = `${context}.items[${index}]`;
      validateAtomicValue(item, definition, itemContext, true);
      if (typeof item?.id === "string") {
        if (itemIds.has(item.id)) {
          report(`${context} contains duplicate item id: ${item.id}`);
        }
        itemIds.add(item.id);
      }
    });
  }

  for (const [recordId, { data: record }] of records) {
    const fields = collectionFields.get(record.collectionId);
    if (!fields) {
      report(`${recordId} references missing collection: ${String(record.collectionId)}`);
      continue;
    }
    if (!record.fields || typeof record.fields !== "object" || Array.isArray(record.fields)) {
      report(`${recordId}.fields must be an object`);
      continue;
    }

    for (const fieldId of Object.keys(record.fields)) {
      if (!fields.has(fieldId)) {
        report(`${recordId} contains undefined field: ${fieldId}`);
      }
    }
    for (const [fieldId, definition] of fields) {
      if (!(fieldId in record.fields)) {
        if (definition.required) report(`${recordId} is missing required field: ${fieldId}`);
        continue;
      }
      validateFieldValue(record.fields[fieldId], definition, `${recordId}.${fieldId}`);
    }
  }

  function validateBinding(binding, context) {
    if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
      report(`${context} must be a binding object`);
      return;
    }
    if (!BINDING_KINDS.has(binding.kind)) {
      report(`${context} has unsupported binding kind: ${String(binding.kind)}`);
      return;
    }
    if (binding.kind === "literal") {
      if (!Object.hasOwn(binding, "value")) report(`${context} literal is missing value`);
      return;
    }
    if (binding.kind === "asset") {
      validateAssetReference(binding.assetId, null, context);
      return;
    }

    const recordEntry = records.get(binding.recordId);
    if (!recordEntry) {
      report(`${context} references missing record: ${String(binding.recordId)}`);
      return;
    }
    if (binding.kind === "record") return;

    const field = recordEntry.data.fields?.[binding.fieldId];
    if (!field) {
      report(
        `${context} references missing field ${String(binding.fieldId)} on ${binding.recordId}`,
      );
      return;
    }
    if (binding.kind === "item") {
      const item = Array.isArray(field.items)
        ? field.items.find((candidate) => candidate.id === binding.itemId)
        : null;
      if (!item) {
        report(
          `${context} references missing item ${String(binding.itemId)} on ${binding.recordId}.${binding.fieldId}`,
        );
      }
    }
  }

  function visitExplicitBindings(value, context) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visitExplicitBindings(item, `${context}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;

    for (const [key, nested] of Object.entries(value)) {
      if (key === "binding") validateBinding(nested, `${context}.binding`);
      visitExplicitBindings(nested, `${context}.${key}`);
    }
  }

  const outlinedLessonIds = new Set();
  const sectionIds = new Set();
  if (!Array.isArray(project.outline)) {
    report("project.outline must be an array");
  } else {
    for (const section of project.outline) {
      if (!section?.id || sectionIds.has(section.id)) {
        report(`outline contains missing or duplicate section id: ${String(section?.id)}`);
      } else {
        sectionIds.add(section.id);
      }
      if (!Array.isArray(section?.lessonIds)) {
        report(`${String(section?.id)}.lessonIds must be an array`);
        continue;
      }
      for (const lessonId of section.lessonIds) {
        if (!lessons.has(lessonId)) report(`outline references missing lesson: ${lessonId}`);
        if (outlinedLessonIds.has(lessonId)) {
          report(`outline references lesson more than once: ${lessonId}`);
        }
        outlinedLessonIds.add(lessonId);
      }
    }
  }

  const expectedContentKinds = new Map([
    ["exercise", "exercise"],
    ["rich-media", "composition"],
    ["rich-text", "tiptap"],
  ]);

  for (const [lessonId, { data: lesson, file }] of lessons) {
    if (!outlinedLessonIds.has(lessonId)) report(`lesson is not in the outline: ${lessonId}`);
    const expectedContentKind = expectedContentKinds.get(lesson.type);
    if (!expectedContentKind) {
      report(`${lessonId} has unsupported lesson type: ${String(lesson.type)}`);
    } else if (lesson.content?.kind !== expectedContentKind) {
      report(`${lessonId} must use content kind: ${expectedContentKind}`);
    }

    const contentPath = resolveInsideCourse(
      dirname(file),
      lesson.content?.file,
      `${lessonId}.content.file`,
    );
    if (!contentPath) continue;
    const content = await readJson(contentPath);
    if (!content) continue;
    visitExplicitBindings(content, `lesson ${lessonId}`);

    if (lesson.content.kind === "exercise") validateExercise(content, lessonId, report);
  }

  return {
    errors,
    summary: {
      assets: assets.size,
      collections: collections.size,
      lessons: lessons.size,
      placeholderAssets,
      records: records.size,
    },
  };
}

function validateExercise(exercise, lessonId, report) {
  if (!Array.isArray(exercise.prompt)) report(`${lessonId} exercise prompt must be an array`);
  if (!Array.isArray(exercise.options) || exercise.options.length < 2) {
    report(`${lessonId} exercise must contain at least two options`);
    return;
  }

  const optionIds = new Set();
  for (const option of exercise.options) {
    if (!option?.id || typeof option.id !== "string") {
      report(`${lessonId} contains an option without a string id`);
      continue;
    }
    if (optionIds.has(option.id)) report(`${lessonId} contains duplicate option id: ${option.id}`);
    optionIds.add(option.id);
    if (!Array.isArray(option.body) || option.body.length === 0) {
      report(`${lessonId}.${option.id}.body must contain at least one fragment`);
    }
  }

  const correctIds = exercise.evaluation?.correctOptionIds;
  if (exercise.evaluation?.kind !== "selected-options" || !Array.isArray(correctIds)) {
    report(`${lessonId} exercise must use selected-options evaluation`);
    return;
  }
  if (correctIds.length === 0) report(`${lessonId} exercise must have a correct option`);
  const seenCorrectIds = new Set();
  for (const correctId of correctIds) {
    if (!optionIds.has(correctId)) report(`${exercise.id} references missing correct option: ${correctId}`);
    if (seenCorrectIds.has(correctId)) report(`${exercise.id} repeats correct option: ${correctId}`);
    seenCorrectIds.add(correctId);
  }
}

function emptyResult(errors) {
  return {
    errors,
    summary: {
      assets: 0,
      collections: 0,
      lessons: 0,
      placeholderAssets: 0,
      records: 0,
    },
  };
}
