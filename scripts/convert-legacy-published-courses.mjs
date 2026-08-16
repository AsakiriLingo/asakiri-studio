import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";
import { validateExampleCourse } from "./example-course-validator.mjs";

const DEFAULT_INPUT = ".backups/conversion/legacy-published-courses.json";
const DEFAULT_OUTPUT = "converted-courses";

const inputPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_INPUT);
const outputRoot = resolve(process.cwd(), process.argv[3] ?? DEFAULT_OUTPUT);

const FIELD_WORD = "field_word";
const FIELD_MEANING = "field_meaning";
const FIELD_PART_OF_SPEECH = "field_part_of_speech";
const FIELD_EXAMPLE_SENTENCE = "field_example_sentence";
const COLLECTION_ID = "collection_legacy_exercise_items";

function byOrder(left, right) {
  return (left.order ?? 0) - (right.order ?? 0) || String(left.id).localeCompare(String(right.id));
}

function normalizedText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function nonEmpty(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function safeId(prefix, value) {
  return `${prefix}_${String(value).replace(/[^a-zA-Z0-9_-]+/g, "_")}`;
}

function slugify(value, fallback) {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || fallback;
}

function localeFor(language) {
  const key = normalizedText(language);
  const locales = new Map([
    ["english", "en"],
    ["english (uk)", "en-GB"],
    ["japanese", "ja"],
    ["french", "fr"],
    ["français", "fr"],
    ["portuguese", "pt"],
    ["spanish", "es"],
    ["dutch", "nl"],
    ["german", "de"],
    ["russian", "ru"],
    ["hindi", "hi"],
    ["malayalam", "ml"],
    ["telugu", "te"],
    ["italian", "it"],
    ["irish", "ga"],
    ["cornish", "kw"],
    ["northern sami", "se"],
    ["kildin sami", "sjd"],
    ["mirandese", "mwl"],
    ["valencian", "ca-valencia"],
    ["k’iche’", "quc"],
    ["k'iche'", "quc"],
    ["okinawan", "ryu"],
  ]);
  return locales.get(key) ?? "und";
}

function textFromPortableJson(value) {
  const pieces = [];
  function visit(node) {
    if (typeof node === "string") {
      pieces.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    if (typeof node.text === "string") pieces.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(visit);
  }
  visit(value);
  return pieces.join(" ").replace(/\s+/g, " ").trim();
}

function literalBinding(text) {
  return { kind: "literal", value: { type: "text", text: String(text ?? "") } };
}

function literalFragment(id, role, text) {
  return { id, role, binding: literalBinding(text) };
}

function fieldFragment(id, role, recordId, fieldId) {
  return { id, role, binding: { kind: "field", recordId, fieldId } };
}

function headingDocument(title, body) {
  const content = [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: title }],
    },
  ];
  if (nonEmpty(body)) {
    content.push({ type: "paragraph", content: [{ type: "text", text: body }] });
  }
  return { type: "doc", content };
}

function recordId(itemId) {
  return safeId("record", itemId);
}

function createRecord(item) {
  const fields = {
    [FIELD_WORD]: { kind: "text", value: String(item.word ?? "") },
    [FIELD_MEANING]: { kind: "text", value: String(item.meaning ?? "") },
  };
  if (nonEmpty(item.partOfSpeech)) {
    fields[FIELD_PART_OF_SPEECH] = { kind: "text", value: item.partOfSpeech };
  }
  if (nonEmpty(item.exampleSentence)) {
    fields[FIELD_EXAMPLE_SENTENCE] = { kind: "text", value: item.exampleSentence };
  }
  return {
    id: recordId(item.id),
    collectionId: COLLECTION_ID,
    fields,
    legacy: { exerciseItemId: item.id, exerciseGroupId: item.groupId },
  };
}

function createCollection(items, sourceLocale, targetLocale, recordFiles) {
  return {
    id: COLLECTION_ID,
    name: "Legacy exercise content",
    description: "Content records recovered from the published legacy exercise items.",
    fields: [
      {
        id: FIELD_WORD,
        name: "Word or prompt",
        kind: "text",
        cardinality: "one",
        required: true,
        locale: targetLocale,
      },
      {
        id: FIELD_MEANING,
        name: "Meaning or translation",
        kind: "text",
        cardinality: "one",
        required: true,
        locale: sourceLocale,
      },
      {
        id: FIELD_PART_OF_SPEECH,
        name: "Part of speech",
        kind: "text",
        cardinality: "one",
        required: false,
      },
      {
        id: FIELD_EXAMPLE_SENTENCE,
        name: "Example sentence",
        kind: "text",
        cardinality: "one",
        required: false,
        locale: targetLocale,
      },
    ],
    recordFiles,
    legacy: { recordCount: items.length },
  };
}

function indexBy(items, key) {
  const index = new Map();
  for (const item of items) {
    const value = item[key];
    if (!index.has(value)) index.set(value, []);
    index.get(value).push(item);
  }
  return index;
}

function buildTextLookup(items) {
  const lookup = new Map();
  for (const item of items) {
    const candidates = [
      [item.word, FIELD_WORD],
      [item.meaning, FIELD_MEANING],
      [item.partOfSpeech, FIELD_PART_OF_SPEECH],
      [item.exampleSentence, FIELD_EXAMPLE_SENTENCE],
    ];
    for (const [text, fieldId] of candidates) {
      const key = normalizedText(text);
      if (key && !lookup.has(key)) {
        lookup.set(key, { kind: "field", recordId: recordId(item.id), fieldId });
      }
    }
  }
  return lookup;
}

function bindingForText(text, lookup) {
  return lookup.get(normalizedText(text)) ?? literalBinding(text);
}

function fragmentsForItem(variant, item, primaryText) {
  const fragments = [];
  const primary = nonEmpty(primaryText);
  if (primary) {
    fragments.push(literalFragment(safeId("prompt", variant.id), "primary", primary));
  }
  const word = nonEmpty(item.word);
  const meaning = nonEmpty(item.meaning);
  if (word && normalizedText(word) !== normalizedText(primary)) {
    fragments.push(
      fieldFragment(
        safeId("content_word", variant.id),
        primary ? "supporting-text" : "primary",
        recordId(item.id),
        FIELD_WORD,
      ),
    );
  }
  if (
    meaning &&
    normalizedText(meaning) !== normalizedText(primary) &&
    normalizedText(meaning) !== normalizedText(word)
  ) {
    fragments.push(
      fieldFragment(
        safeId("content_meaning", variant.id),
        "translation",
        recordId(item.id),
        FIELD_MEANING,
      ),
    );
  }
  const hasContentBinding = fragments.some((fragment) => fragment.binding.kind !== "literal");
  if (!hasContentBinding) {
    fragments.push(
      fieldFragment(
        safeId("content_reference", variant.id),
        "content-reference",
        recordId(item.id),
        FIELD_WORD,
      ),
    );
  }
  return fragments;
}

function choice(id, text, lookup, role = "primary") {
  return {
    id,
    body: [
      {
        id: safeId("fragment", id),
        role,
        binding: bindingForText(text, lookup),
      },
    ],
  };
}

function acceptedValues(values, lookup) {
  const unique = [...new Set(values.map(nonEmpty).filter(Boolean))];
  return unique.map((value) => ({ binding: bindingForText(value, lookup) }));
}

function exerciseTitle(type, item, index) {
  const label =
    {
      mcq: "Multiple choice",
      word_cloze: "Fill the blank",
      multi_blank: "Fill the blanks",
      sentence_builder: "Build the sentence",
    }[type] ?? "Exercise";
  const subject = nonEmpty(item.word);
  return subject ? `${label}: ${subject.slice(0, 72)}` : `${label} ${String(index + 1)}`;
}

function convertMcq(variant, item, options, lookup, warnings) {
  const convertedOptions = options.map((option) => {
    const label = nonEmpty(option.label) ?? nonEmpty(option.value) ?? "Option";
    return choice(safeId("option", option.id), label, lookup);
  });
  let correct = options.filter((option) => option.isCorrect);
  if (correct.length === 0) {
    const legacySolution = String(variant.solution?.correctOptionId ?? "");
    correct = options.filter((option) => String(option.id) === legacySolution);
  }
  if (correct.length === 0 && options.length > 0) {
    warnings.push(`MCQ ${variant.id} has no usable answer key; its first option was selected.`);
    correct = [options[0]];
  }
  const explanation = nonEmpty(variant.solution?.explanation);
  return {
    id: safeId("exercise", variant.id),
    type: "multiple-choice",
    instruction: nonEmpty(item.word) ?? "Choose the correct answer.",
    prompt: fragmentsForItem(variant, item, variant.prompt?.stem),
    options: convertedOptions,
    evaluation: {
      kind: "selected-options",
      select: correct.length > 1 ? "many" : "one",
      correctOptionIds: correct.map((option) => safeId("option", option.id)),
    },
    ...(explanation
      ? {
          feedback: {
            correct: [literalFragment(safeId("feedback", variant.id), "primary", explanation)],
          },
        }
      : {}),
    legacy: { variantId: variant.id, type: variant.type },
  };
}

function splitSingleBlank(text, variantId) {
  const source = String(text ?? "");
  const match = /_+|＿+|\[blank\]/i.exec(source);
  if (!match) return null;
  const segments = [];
  const before = source.slice(0, match.index);
  const after = source.slice(match.index + match[0].length);
  if (before) {
    segments.push({
      kind: "text",
      fragment: literalFragment(safeId("stem_before", variantId), "primary", before),
    });
  }
  segments.push({ kind: "blank", id: safeId("blank", variantId) });
  if (after) {
    segments.push({
      kind: "text",
      fragment: literalFragment(safeId("stem_after", variantId), "primary", after),
    });
  }
  return segments;
}

function convertWordCloze(variant, item, lookup, warnings) {
  const blankId = safeId("blank", variant.id);
  const stem = splitSingleBlank(variant.prompt?.clozeText, variant.id);
  if (!stem) {
    warnings.push(`Cloze ${variant.id} had no recognized marker; a trailing blank was added.`);
  }
  const correct = nonEmpty(variant.solution?.correctAnswer) ?? "";
  const alternatives = Array.isArray(variant.solution?.acceptedAlternatives)
    ? variant.solution.acceptedAlternatives
    : [];
  const hint = nonEmpty(variant.prompt?.hint);
  return {
    id: safeId("exercise", variant.id),
    type: "fill-blank",
    instruction: nonEmpty(item.word) ?? "Fill in the blank.",
    prompt: fragmentsForItem(variant, item, hint),
    stem: stem ?? [
      {
        kind: "text",
        fragment: literalFragment(
          safeId("stem_text", variant.id),
          "primary",
          String(variant.prompt?.clozeText ?? ""),
        ),
      },
      { kind: "blank", id: blankId },
    ],
    ...(nonEmpty(item.meaning)
      ? {
          translation: fieldFragment(
            safeId("translation", variant.id),
            "translation",
            recordId(item.id),
            FIELD_MEANING,
          ),
        }
      : {}),
    evaluation: {
      kind: "filled-blanks",
      blanks: [
        {
          blankId,
          accepted: {
            values: acceptedValues([correct, ...alternatives], lookup),
            normalize: { ignoreCase: true, ignoreWhitespace: true },
          },
        },
      ],
    },
    legacy: { variantId: variant.id, type: variant.type },
  };
}

function splitMultiBlankTemplate(template, solutions, variantId) {
  const source = String(template ?? "");
  const byKey = new Map(solutions.map((blank) => [String(blank.key), blank]));
  const seen = new Set();
  const segments = [];
  const pattern = /\{([^{}]+)\}/g;
  let cursor = 0;
  let match;
  let textIndex = 0;
  while ((match = pattern.exec(source)) !== null) {
    const key = String(match[1]);
    if (!byKey.has(key)) continue;
    const before = source.slice(cursor, match.index);
    if (before) {
      segments.push({
        kind: "text",
        fragment: literalFragment(
          safeId(`stem_${String(textIndex++)}`, variantId),
          "primary",
          before,
        ),
      });
    }
    segments.push({ kind: "blank", id: safeId("blank", `${variantId}_${key}`) });
    seen.add(key);
    cursor = match.index + match[0].length;
  }
  const after = source.slice(cursor);
  if (after) {
    segments.push({
      kind: "text",
      fragment: literalFragment(safeId(`stem_${String(textIndex)}`, variantId), "primary", after),
    });
  }
  for (const blank of solutions) {
    const key = String(blank.key);
    if (!seen.has(key))
      segments.push({ kind: "blank", id: safeId("blank", `${variantId}_${key}`) });
  }
  return segments;
}

function convertMultiBlank(variant, item, lookup) {
  const solutions = Array.isArray(variant.solution?.blanks) ? variant.solution.blanks : [];
  const bank = [];
  const answers = [];
  for (const [blankIndex, blank] of solutions.entries()) {
    const key = String(blank.key ?? `blank_${String(blankIndex + 1)}`);
    const choices = Array.isArray(blank.choices) ? [...blank.choices] : [];
    const correctAnswer = nonEmpty(blank.correctAnswer) ?? "";
    if (
      correctAnswer &&
      !choices.some((entry) => normalizedText(entry) === normalizedText(correctAnswer))
    ) {
      choices.push(correctAnswer);
    }
    if (choices.length > 0) {
      const optionIds = [];
      for (const [choiceIndex, value] of choices.entries()) {
        const optionId = safeId("bank", `${variant.id}_${key}_${String(choiceIndex + 1)}`);
        bank.push(choice(optionId, value, lookup));
        if (normalizedText(value) === normalizedText(correctAnswer)) optionIds.push(optionId);
      }
      answers.push({
        blankId: safeId("blank", `${variant.id}_${key}`),
        correctOptionIds: optionIds,
      });
    } else {
      answers.push({
        blankId: safeId("blank", `${variant.id}_${key}`),
        accepted: {
          values: acceptedValues([correctAnswer], lookup),
          normalize: { ignoreCase: true, ignoreWhitespace: true },
        },
      });
    }
  }
  return {
    id: safeId("exercise", variant.id),
    type: "fill-blank",
    instruction: nonEmpty(item.word) ?? "Fill in each blank.",
    prompt: fragmentsForItem(variant, item, null),
    stem: splitMultiBlankTemplate(variant.prompt?.template, solutions, variant.id),
    ...(bank.length > 0 ? { bank } : {}),
    evaluation: { kind: "filled-blanks", blanks: answers },
    legacy: { variantId: variant.id, type: variant.type },
  };
}

function multisetRemainder(source, used) {
  const remaining = [...source];
  for (const token of used) {
    const index = remaining.findIndex((candidate) => String(candidate) === String(token));
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining;
}

function convertSentenceBuilder(variant, item, lookup) {
  const targetTokens = Array.isArray(variant.solution?.targetTokens)
    ? variant.solution.targetTokens
    : [];
  const sourceTokens = Array.isArray(variant.prompt?.sourceTokens)
    ? variant.prompt.sourceTokens
    : [];
  const explicitDistractors = Array.isArray(variant.solution?.distractorTokens)
    ? variant.solution.distractorTokens
    : [];
  const distractorValues = [
    ...multisetRemainder(sourceTokens, targetTokens),
    ...explicitDistractors,
  ];
  const tokens = targetTokens.map((token, index) =>
    choice(safeId("token", `${variant.id}_${String(index + 1)}`), token, lookup),
  );
  const distractors = distractorValues.map((token, index) =>
    choice(safeId("distractor", `${variant.id}_${String(index + 1)}`), token, lookup),
  );
  const helper = nonEmpty(variant.prompt?.helperText);
  const notes = nonEmpty(variant.solution?.notes);
  return {
    id: safeId("exercise", variant.id),
    type: "word-order",
    instruction: nonEmpty(item.word) ?? "Put the tokens in the correct order.",
    prompt: fragmentsForItem(variant, item, helper),
    tokens,
    ...(distractors.length > 0 ? { distractors } : {}),
    evaluation: {
      kind: "ordered-tokens",
      correctOrder: tokens.map((token) => token.id),
    },
    ...(notes
      ? {
          feedback: {
            correct: [literalFragment(safeId("feedback", variant.id), "primary", notes)],
          },
        }
      : {}),
    legacy: { variantId: variant.id, type: variant.type },
  };
}

function convertExercise(variant, item, options, lookup, warnings) {
  switch (variant.type) {
    case "mcq":
      return convertMcq(variant, item, options, lookup, warnings);
    case "word_cloze":
      return convertWordCloze(variant, item, lookup, warnings);
    case "multi_blank":
      return convertMultiBlank(variant, item, lookup);
    case "sentence_builder":
      return convertSentenceBuilder(variant, item, lookup);
    default:
      throw new Error(`Unsupported legacy exercise type: ${String(variant.type)}`);
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

async function ensureNewDirectory(path) {
  try {
    await access(path);
    throw new Error(`Output already exists: ${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(path, { recursive: true, mode: 0o700 });
}

function courseDescription(course) {
  if (typeof course.description === "string") return course.description;
  return textFromPortableJson(course.description);
}

function partPath(directoryName, partDirectory, filename) {
  return `lessons/${directoryName}/parts/${partDirectory}/${filename}`;
}

async function convertCourse(data, course, publication, indexes) {
  const directoryName = slugify(publication.slug, `course-${String(course.id).slice(0, 8)}`);
  const courseRoot = resolve(outputRoot, directoryName);
  await ensureNewDirectory(courseRoot);

  const warnings = [];
  const units = (indexes.unitsByCourse.get(course.id) ?? []).sort(byOrder);
  const courseLessons = indexes.lessonsByCourse.get(course.id) ?? [];
  const courseGroups = indexes.groupsByCourse.get(course.id) ?? [];
  const placedLessonIds = new Set();
  const placedGroupIds = new Set();
  for (const unit of units) {
    for (const node of indexes.nodesByUnit.get(unit.id) ?? []) {
      if (node.lessonId) placedLessonIds.add(node.lessonId);
      if (node.exerciseGroupId) placedGroupIds.add(node.exerciseGroupId);
    }
  }

  const unplacedLessons = courseLessons.filter((lesson) => !placedLessonIds.has(lesson.id));
  const unplacedGroups = courseGroups.filter((group) => !placedGroupIds.has(group.id));
  if (unplacedLessons.length > 0)
    warnings.push(`${unplacedLessons.length} unplaced legacy lesson(s) omitted.`);
  if (unplacedGroups.length > 0)
    warnings.push(`${unplacedGroups.length} unplaced exercise group(s) omitted.`);
  if (course.coverImageUrl)
    warnings.push("Remote legacy cover image was recorded as provenance but not downloaded.");

  const lessonFiles = [];
  const outline = [];
  const usedLessonIds = new Set();
  const usedGroupIds = new Set();
  const convertedItemIds = new Set();
  let partCount = 0;
  let skippedEmptyGroups = 0;

  for (const unit of units) {
    const outlineLessonIds = [];
    const nodes = [...(indexes.nodesByUnit.get(unit.id) ?? [])].sort(byOrder);
    for (const node of nodes) {
      if (node.type === "lesson" && node.lessonId) {
        if (usedLessonIds.has(node.lessonId)) {
          warnings.push(
            `Lesson ${node.lessonId} appeared more than once in the outline; duplicate omitted.`,
          );
          continue;
        }
        const lesson = indexes.lessonById.get(node.lessonId);
        if (!lesson) {
          warnings.push(`Unit node ${node.id} references missing lesson ${node.lessonId}.`);
          continue;
        }
        usedLessonIds.add(node.lessonId);
        const newLessonId = safeId("lesson", lesson.id);
        const lessonDirectory = slugify(
          lesson.slug || lesson.title,
          `lesson-${String(lesson.id).slice(0, 8)}`,
        );
        const lessonRoot = resolve(courseRoot, "lessons", lessonDirectory);
        await mkdir(lessonRoot, { recursive: true, mode: 0o700 });
        const sections = [...(indexes.sectionsByLesson.get(lesson.id) ?? [])].sort(byOrder);
        const parts = [];
        if (sections.length === 0) {
          const partDirectory = "legacy-empty";
          const documentPath = partPath(lessonDirectory, partDirectory, "document.json");
          await mkdir(resolve(courseRoot, "lessons", lessonDirectory, "parts", partDirectory), {
            recursive: true,
            mode: 0o700,
          });
          await writeJson(resolve(courseRoot, documentPath), headingDocument(lesson.title, null));
          parts.push({
            id: safeId("part_empty", lesson.id),
            title: lesson.title,
            content: { kind: "tiptap", file: `parts/${partDirectory}/document.json` },
          });
          warnings.push(`Lesson ${lesson.title} had no sections; a title-only part was created.`);
        } else {
          for (const [sectionIndex, section] of sections.entries()) {
            const partDirectory = `section-${String(sectionIndex + 1).padStart(2, "0")}-${String(section.id).slice(0, 8)}`;
            const documentPath = partPath(lessonDirectory, partDirectory, "document.json");
            await mkdir(resolve(courseRoot, "lessons", lessonDirectory, "parts", partDirectory), {
              recursive: true,
              mode: 0o700,
            });
            const document =
              section.content?.type === "doc"
                ? section.content
                : headingDocument(nonEmpty(section.title) ?? lesson.title, null);
            if (section.content?.type !== "doc") {
              warnings.push(
                `Section ${section.id} had no Tiptap document; a title-only document was created.`,
              );
            }
            await writeJson(resolve(courseRoot, documentPath), document);
            parts.push({
              id: safeId("part_section", section.id),
              title: nonEmpty(section.title) ?? `Part ${String(sectionIndex + 1)}`,
              content: { kind: "tiptap", file: `parts/${partDirectory}/document.json` },
              legacy: { sectionId: section.id },
            });
          }
        }
        partCount += parts.length;
        const lessonManifest = {
          id: newLessonId,
          title: lesson.title,
          parts,
          legacy: { lessonId: lesson.id, status: lesson.status },
        };
        const lessonManifestPath = `lessons/${lessonDirectory}/lesson.json`;
        await writeJson(resolve(courseRoot, lessonManifestPath), lessonManifest);
        lessonFiles.push(lessonManifestPath);
        outlineLessonIds.push(newLessonId);
        continue;
      }

      if (node.type === "exercise_group" && node.exerciseGroupId) {
        if (usedGroupIds.has(node.exerciseGroupId)) {
          warnings.push(
            `Exercise group ${node.exerciseGroupId} appeared more than once; duplicate omitted.`,
          );
          continue;
        }
        const group = indexes.groupById.get(node.exerciseGroupId);
        if (!group) {
          warnings.push(
            `Unit node ${node.id} references missing exercise group ${node.exerciseGroupId}.`,
          );
          continue;
        }
        usedGroupIds.add(node.exerciseGroupId);
        const variants = [...(indexes.variantsByGroup.get(group.id) ?? [])].sort(byOrder);
        if (variants.length === 0) {
          skippedEmptyGroups += 1;
          warnings.push(
            `Exercise group ${group.title} contained no exercise variants and was omitted.`,
          );
          continue;
        }
        const groupItems = indexes.itemsByGroup.get(group.id) ?? [];
        const lookup = buildTextLookup(groupItems);
        const newLessonId = safeId("lesson_exercise_group", group.id);
        const lessonDirectory = slugify(group.title, `exercises-${String(group.id).slice(0, 8)}`);
        await mkdir(resolve(courseRoot, "lessons", lessonDirectory), {
          recursive: true,
          mode: 0o700,
        });
        const parts = [];
        for (const [variantIndex, variant] of variants.entries()) {
          const item = indexes.itemById.get(variant.itemId);
          if (!item) {
            warnings.push(
              `Exercise variant ${variant.id} references missing item ${variant.itemId}; omitted.`,
            );
            continue;
          }
          convertedItemIds.add(item.id);
          const options = [...(indexes.optionsByVariant.get(variant.id) ?? [])].sort(byOrder);
          const exercise = convertExercise(variant, item, options, lookup, warnings);
          const partDirectory = `exercise-${String(variantIndex + 1).padStart(3, "0")}-${String(variant.id).slice(0, 8)}`;
          await mkdir(resolve(courseRoot, "lessons", lessonDirectory, "parts", partDirectory), {
            recursive: true,
            mode: 0o700,
          });
          await writeJson(
            resolve(courseRoot, partPath(lessonDirectory, partDirectory, "exercise.json")),
            exercise,
          );
          parts.push({
            id: safeId("part_exercise", variant.id),
            title: exerciseTitle(variant.type, item, variantIndex),
            content: { kind: "exercise", file: `parts/${partDirectory}/exercise.json` },
            legacy: { variantId: variant.id, itemId: item.id },
          });
        }
        if (parts.length === 0) {
          skippedEmptyGroups += 1;
          warnings.push(
            `Exercise group ${group.title} produced no valid exercise parts and was omitted.`,
          );
          continue;
        }
        partCount += parts.length;
        const lessonManifest = {
          id: newLessonId,
          title: group.title,
          parts,
          legacy: {
            exerciseGroupId: group.id,
            datasetType: group.datasetType,
            description: group.description,
          },
        };
        const lessonManifestPath = `lessons/${lessonDirectory}/lesson.json`;
        await writeJson(resolve(courseRoot, lessonManifestPath), lessonManifest);
        lessonFiles.push(lessonManifestPath);
        outlineLessonIds.push(newLessonId);
        continue;
      }

      warnings.push(
        `Unit node ${node.id} has unsupported type ${String(node.type)} and was omitted.`,
      );
    }
    outline.push({
      id: safeId("unit", unit.id),
      title: unit.title,
      lessonIds: outlineLessonIds,
      legacy: { unitId: unit.id, order: unit.order },
    });
  }

  const convertedItems = data.exerciseItems
    .filter((item) => convertedItemIds.has(item.id))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const collections = [];
  if (convertedItems.length > 0) {
    const collectionDirectory = resolve(courseRoot, "content", "collections");
    const recordsDirectory = resolve(courseRoot, "content", "records");
    await mkdir(collectionDirectory, { recursive: true, mode: 0o700 });
    await mkdir(recordsDirectory, { recursive: true, mode: 0o700 });
    const recordFiles = [];
    for (const item of convertedItems) {
      const filename = `${safeId("record", item.id)}.json`;
      await writeJson(resolve(recordsDirectory, filename), createRecord(item));
      recordFiles.push(`../records/${filename}`);
    }
    const collectionPath = "content/collections/legacy-exercise-items.json";
    await writeJson(
      resolve(courseRoot, collectionPath),
      createCollection(
        convertedItems,
        localeFor(course.sourceLanguage),
        localeFor(course.targetLanguage),
        recordFiles,
      ),
    );
    collections.push(collectionPath);
  }

  const description = courseDescription(course);
  const manifest = {
    $comment:
      "Converted from the legacy hosted Asakiri database into the current Studio draft layout.",
    format: "asakiri-example",
    formatVersion: "0.1-draft",
    project: {
      id: safeId("course", course.id),
      title: course.title,
      subtitle: nonEmpty(course.subtitle) ?? "",
      description,
      defaultLocale: localeFor(course.sourceLanguage),
      learningLocales: [localeFor(course.targetLanguage)],
      level: nonEmpty(course.difficulty) ?? "",
      estimatedLength: `${String(lessonFiles.length)} lessons`,
      license: "",
      copyrightHolder: "",
      copyrightYear: "",
      coverAssetId: null,
      contributors: course.creatorName
        ? [{ id: "legacy_creator", name: course.creatorName, role: "Course creator", links: [] }]
        : [],
      funding: [],
      sponsors: [],
    },
    collections,
    assets: [],
    lessons: lessonFiles,
    outline,
    legacy: {
      source: "legacy-postgresql-published-course",
      courseId: course.id,
      publicationId: publication.id,
      publicationSlug: publication.slug,
      publicationVersion: publication.version,
      wasListed: publication.isListed,
      sourceLanguage: course.sourceLanguage,
      targetLanguage: course.targetLanguage,
      coverImageUrl: course.coverImageUrl,
    },
  };
  await writeJson(resolve(courseRoot, "project.json"), manifest);

  const validation = await validateExampleCourse(courseRoot);
  const result = {
    slug: directoryName,
    title: course.title,
    source: {
      courseId: course.id,
      publicationId: publication.id,
      publicationVersion: publication.version,
      isListed: publication.isListed,
    },
    converted: {
      units: outline.length,
      lessons: lessonFiles.length,
      parts: partCount,
      records: convertedItems.length,
      skippedEmptyExerciseGroups: skippedEmptyGroups,
    },
    warnings,
    errors: validation.errors,
    validatorSummary: validation.summary,
  };
  await writeJson(resolve(courseRoot, "conversion.json"), result);
  return result;
}

async function main() {
  const data = JSON.parse(await readFile(inputPath, "utf8"));
  await ensureNewDirectory(outputRoot);

  const indexes = {
    unitsByCourse: indexBy(data.units, "courseId"),
    nodesByUnit: indexBy(data.unitNodes, "unitId"),
    lessonsByCourse: indexBy(data.lessons, "courseId"),
    lessonById: new Map(data.lessons.map((lesson) => [lesson.id, lesson])),
    sectionsByLesson: indexBy(data.sections, "lessonId"),
    groupsByCourse: indexBy(data.exerciseGroups, "courseId"),
    groupById: new Map(data.exerciseGroups.map((group) => [group.id, group])),
    itemsByGroup: indexBy(data.exerciseItems, "groupId"),
    itemById: new Map(data.exerciseItems.map((item) => [item.id, item])),
    variantsByGroup: indexBy(data.exerciseVariants, "groupId"),
    optionsByVariant: indexBy(data.exerciseOptions, "variantId"),
  };
  const courseById = new Map(data.courses.map((course) => [course.id, course]));
  const results = [];
  for (const publication of data.publications) {
    const course = courseById.get(publication.courseId);
    if (!course) throw new Error(`Publication ${publication.id} references a missing course.`);
    results.push(await convertCourse(data, course, publication, indexes));
  }

  const report = {
    input: basename(inputPath),
    outputFormat: { format: "asakiri-example", formatVersion: "0.1-draft" },
    mapping: {
      unit: "outline unit",
      lesson: "lesson with one Tiptap part per legacy section",
      exercise_group: "generated lesson with one exercise part per legacy variant",
      mcq: "multiple-choice",
      word_cloze: "fill-blank",
      multi_blank: "fill-blank",
      sentence_builder: "word-order",
    },
    courses: results,
    totals: {
      courses: results.length,
      validCourses: results.filter((result) => result.errors.length === 0).length,
      units: results.reduce((sum, result) => sum + result.converted.units, 0),
      lessons: results.reduce((sum, result) => sum + result.converted.lessons, 0),
      parts: results.reduce((sum, result) => sum + result.converted.parts, 0),
      records: results.reduce((sum, result) => sum + result.converted.records, 0),
      warnings: results.reduce((sum, result) => sum + result.warnings.length, 0),
      errors: results.reduce((sum, result) => sum + result.errors.length, 0),
    },
  };
  await writeJson(resolve(outputRoot, "conversion-report.json"), report);
  await writeFile(
    resolve(outputRoot, "README.md"),
    [
      "# Converted published Asakiri courses",
      "",
      "These directories were generated from the latest publication of each legacy database course.",
      "Each project targets the current Studio draft layout (`asakiri-example` / `0.1-draft`).",
      "",
      "Legacy units became outline units. Legacy lessons became lessons with one Tiptap part per section.",
      "Unit-level exercise groups became generated lessons with converted exercise parts.",
      "See `conversion-report.json` and each course's `conversion.json` for warnings and provenance.",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  console.log(JSON.stringify(report.totals));
  if (report.totals.errors > 0) process.exitCode = 1;
}

await main();
