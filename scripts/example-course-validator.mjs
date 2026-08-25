import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const SUPPORTED_FORMAT = "asakiri-course";
const SUPPORTED_VERSION = 1;
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
  const assetsWithFiles = await loadReferencedJson(root, project.assets, "project.assets");
  const lessonsWithFiles = await loadReferencedJson(root, project.lessons, "project.lessons");

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
        report(`${context}.${field.id} has unsupported cardinality: ${String(field.cardinality)}`);
      }
      if (field.kind === "asset" && (!field.assetKind || !ASSET_KINDS.has(field.assetKind))) {
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
      } else {
        const bytes = await readFile(mediaPath);
        if (typeof asset.sha256 !== "string") {
          report(`${assetId} is ready but records no sha256`);
        } else if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256) {
          report(`${assetId} sha256 does not match its file`);
        }
        if (asset.byteSize !== bytes.length) {
          report(`${assetId} byteSize does not match its file`);
        }
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

  const CONTENT_KINDS = new Set(["tiptap", "composition", "exercise"]);
  let parts = 0;

  for (const [lessonId, { data: lesson, file }] of lessons) {
    if (!outlinedLessonIds.has(lessonId)) report(`lesson is not in the outline: ${lessonId}`);
    if (!Array.isArray(lesson.parts) || lesson.parts.length === 0) {
      report(`${lessonId} must contain at least one part`);
      continue;
    }

    const partIds = new Set();
    for (const part of lesson.parts) {
      if (!part?.id || typeof part.id !== "string") {
        report(`${lessonId} contains a part without a string id`);
        continue;
      }
      if (partIds.has(part.id)) report(`${lessonId} contains duplicate part id: ${part.id}`);
      partIds.add(part.id);
      parts += 1;

      const partId = `${lessonId}.${part.id}`;
      const contentKind = part.content?.kind;
      if (!CONTENT_KINDS.has(contentKind)) {
        report(`${partId} has unsupported content kind: ${String(contentKind)}`);
        continue;
      }

      const contentPath = resolveInsideCourse(
        dirname(file),
        part.content?.file,
        `${partId}.content.file`,
      );
      if (!contentPath) continue;
      const content = await readJson(contentPath);
      if (!content) continue;
      visitExplicitBindings(content, partId);

      if (contentKind === "exercise") validateExercise(content, partId, report);
    }
  }

  return {
    errors,
    summary: {
      assets: assets.size,
      collections: collections.size,
      lessons: lessons.size,
      parts,
      placeholderAssets,
      records: records.size,
    },
  };
}

const EXERCISE_TYPES = new Set([
  "multiple-choice",
  "match-pairs",
  "fill-blank",
  "word-order",
  "listening",
  "speaking",
]);

// Bindings anywhere under a `binding` key (option bodies, fragments, accepted values)
// are validated separately by visitExplicitBindings. These validators check structure
// and that evaluation references resolve to IDs the exercise actually defines.
function validateExercise(exercise, lessonId, report) {
  if (!Array.isArray(exercise.prompt)) report(`${lessonId} exercise prompt must be an array`);
  if (typeof exercise.type !== "string" || !EXERCISE_TYPES.has(exercise.type)) {
    report(`${lessonId} exercise has unknown type: ${String(exercise.type)}`);
    return;
  }

  switch (exercise.type) {
    case "multiple-choice":
      validateSelectedOptions(exercise, lessonId, report, exercise.options);
      break;
    case "match-pairs":
      validateMatchPairs(exercise, lessonId, report);
      break;
    case "fill-blank":
      validateFillBlank(exercise, lessonId, report);
      break;
    case "word-order":
      validateWordOrder(exercise, lessonId, report);
      break;
    case "listening":
      validateListening(exercise, lessonId, report);
      break;
    case "speaking":
      validateSpeaking(exercise, lessonId, report);
      break;
  }
}

function collectChoiceIds(items, lessonId, label, report, { min = 1 } = {}) {
  if (!Array.isArray(items) || items.length < min) {
    report(`${lessonId} ${label} must contain at least ${min} item(s)`);
    return null;
  }
  const ids = new Set();
  for (const item of items) {
    if (!item?.id || typeof item.id !== "string") {
      report(`${lessonId} ${label} contains an item without a string id`);
      continue;
    }
    if (ids.has(item.id)) report(`${lessonId} ${label} contains duplicate id: ${item.id}`);
    ids.add(item.id);
    if (!Array.isArray(item.body) || item.body.length === 0) {
      report(`${lessonId}.${item.id}.body must contain at least one fragment`);
    }
  }
  return ids;
}

function validateIdReferences(refs, validIds, exerciseId, label, report) {
  const seen = new Set();
  for (const ref of refs) {
    if (validIds && !validIds.has(ref)) report(`${exerciseId} references missing ${label}: ${ref}`);
    if (seen.has(ref)) report(`${exerciseId} repeats ${label}: ${ref}`);
    seen.add(ref);
  }
}

function validateSelectedOptions(exercise, lessonId, report, options) {
  const optionIds = collectChoiceIds(options, lessonId, "options", report, { min: 2 });
  const evaluation = exercise.evaluation;
  if (evaluation?.kind !== "selected-options" || !Array.isArray(evaluation.correctOptionIds)) {
    report(`${lessonId} exercise must use selected-options evaluation`);
    return;
  }
  if (
    evaluation.select !== undefined &&
    evaluation.select !== "one" &&
    evaluation.select !== "many"
  ) {
    report(`${lessonId} evaluation.select must be "one" or "many"`);
  }
  if (evaluation.correctOptionIds.length === 0)
    report(`${lessonId} exercise must have a correct option`);
  validateIdReferences(
    evaluation.correctOptionIds,
    optionIds,
    exercise.id,
    "correct option",
    report,
  );
}

function validateMatchPairs(exercise, lessonId, report) {
  const leftIds = collectChoiceIds(exercise.left, lessonId, "left", report, { min: 1 });
  const rightIds = collectChoiceIds(exercise.right, lessonId, "right", report, { min: 1 });
  const evaluation = exercise.evaluation;
  if (
    evaluation?.kind !== "matched-pairs" ||
    !Array.isArray(evaluation.pairs) ||
    evaluation.pairs.length === 0
  ) {
    report(`${lessonId} exercise must use matched-pairs evaluation`);
    return;
  }
  const seenLeft = new Set();
  for (const pair of evaluation.pairs) {
    if (leftIds && !leftIds.has(pair?.leftId))
      report(`${exercise.id} pair references missing left id: ${String(pair?.leftId)}`);
    if (rightIds && !rightIds.has(pair?.rightId))
      report(`${exercise.id} pair references missing right id: ${String(pair?.rightId)}`);
    if (seenLeft.has(pair?.leftId))
      report(`${exercise.id} left id appears in multiple pairs: ${pair?.leftId}`);
    seenLeft.add(pair?.leftId);
  }
}

function validateFillBlank(exercise, lessonId, report) {
  const blankIds = new Set();
  if (!Array.isArray(exercise.stem) || exercise.stem.length === 0) {
    report(`${lessonId} fill-blank must have a stem`);
  } else {
    for (const segment of exercise.stem) {
      if (segment?.kind !== "blank") continue;
      if (!segment.id || typeof segment.id !== "string") {
        report(`${lessonId} fill-blank has a blank without a string id`);
      } else if (blankIds.has(segment.id)) {
        report(`${lessonId} fill-blank has duplicate blank id: ${segment.id}`);
      } else {
        blankIds.add(segment.id);
      }
    }
  }
  if (blankIds.size === 0) report(`${lessonId} fill-blank must define at least one blank`);

  const bankIds =
    exercise.bank !== undefined
      ? collectChoiceIds(exercise.bank, lessonId, "bank", report, { min: 1 })
      : null;

  const evaluation = exercise.evaluation;
  if (evaluation?.kind !== "filled-blanks" || !Array.isArray(evaluation.blanks)) {
    report(`${lessonId} exercise must use filled-blanks evaluation`);
    return;
  }
  const answered = new Set();
  for (const blank of evaluation.blanks) {
    if (!blankIds.has(blank?.blankId))
      report(`${exercise.id} answers unknown blank: ${String(blank?.blankId)}`);
    answered.add(blank?.blankId);
    const hasOptions = Array.isArray(blank?.correctOptionIds) && blank.correctOptionIds.length > 0;
    const hasTyped = Array.isArray(blank?.accepted?.values) && blank.accepted.values.length > 0;
    if (!hasOptions && !hasTyped) {
      report(
        `${exercise.id} blank ${String(blank?.blankId)} needs correctOptionIds or accepted values`,
      );
    }
    if (hasOptions && bankIds)
      validateIdReferences(blank.correctOptionIds, bankIds, exercise.id, "bank option", report);
  }
  for (const id of blankIds) {
    if (!answered.has(id)) report(`${exercise.id} blank ${id} has no answer`);
  }
}

function validateWordOrder(exercise, lessonId, report) {
  const tokenIds = collectChoiceIds(exercise.tokens, lessonId, "tokens", report, { min: 1 });
  if (exercise.distractors !== undefined) {
    collectChoiceIds(exercise.distractors, lessonId, "distractors", report, { min: 1 });
  }
  const evaluation = exercise.evaluation;
  if (
    evaluation?.kind !== "ordered-tokens" ||
    !Array.isArray(evaluation.correctOrder) ||
    evaluation.correctOrder.length === 0
  ) {
    report(`${lessonId} exercise must use ordered-tokens evaluation`);
    return;
  }
  validateIdReferences(evaluation.correctOrder, tokenIds, exercise.id, "ordered token", report);
  if (tokenIds) {
    const ordered = new Set(evaluation.correctOrder);
    for (const id of tokenIds) {
      if (!ordered.has(id)) report(`${exercise.id} answer token missing from correctOrder: ${id}`);
    }
  }
}

function validateListening(exercise, lessonId, report) {
  if (!exercise.stimulus || typeof exercise.stimulus !== "object") {
    report(`${lessonId} listening exercise must have an audio stimulus`);
  }
  if (exercise.answerMode !== "select" && exercise.answerMode !== "type") {
    report(`${lessonId} listening answerMode must be "select" or "type"`);
    return;
  }
  if (exercise.answerMode === "select") {
    validateSelectedOptions(exercise, lessonId, report, exercise.options);
    return;
  }
  const evaluation = exercise.evaluation;
  if (
    evaluation?.kind !== "typed-answer" ||
    !Array.isArray(evaluation.accepted) ||
    evaluation.accepted.length === 0
  ) {
    report(
      `${lessonId} typed listening exercise must use typed-answer evaluation with accepted values`,
    );
  }
}

function validateSpeaking(exercise, lessonId, report) {
  if (!exercise.target || typeof exercise.target !== "object") {
    report(`${lessonId} speaking exercise must have a target phrase`);
  }
  const evaluation = exercise.evaluation;
  if (evaluation?.kind !== "spoken-response") {
    report(`${lessonId} exercise must use spoken-response evaluation`);
    return;
  }
  if (!["lenient", "standard", "strict"].includes(evaluation.strictness)) {
    report(`${lessonId} speaking strictness must be lenient, standard, or strict`);
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
