// Converts a Lingonaut `.cn3` course archive into the Asakiri course folder
// format read by Studio (see examples/courses/japanese-starter for the shape).
//
// Usage:
//   node scripts/convert-lingonaut-course.mjs <input.cn3> [outputDir]
//
// The archive is a ZIP of pipe-delimited tag files:
//   metadata.nmd            course metadata
//   unit*.nml               <skill> -> <lesson> -> {type:...} exercises
//   <skillId>.vocab         term/translation pairs
//   <skillId>.sentences     example sentences ("finnish|english")
//   <skillId>.ntf           intro notes with ^heading^ / *italic* / _italic_
//   <audioId>.mp3           audio referenced by AudioMatch options
//
// Text becomes literal bindings; audio becomes asset bindings. Every skill maps
// to a unit whose first lesson holds the notes + vocabulary + sentences, and
// whose remaining lessons hold the converted exercises.

import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";

const inputPath = resolve(process.cwd(), process.argv[2] ?? "");
const outputRoot = resolve(process.cwd(), process.argv[3] ?? "converted-courses/finnish-lingonaut");

if (!process.argv[2] || !existsSync(inputPath)) {
  console.error("Usage: node scripts/convert-lingonaut-course.mjs <input.cn3> [outputDir]");
  process.exit(1);
}

// --------------------------------------------------------------------------
// Extraction
// --------------------------------------------------------------------------

const tempDir = join(
  process.env.TMPDIR ?? "/tmp",
  `lingonaut-${basename(inputPath).replace(/[^A-Za-z0-9._-]/g, "_")}`,
);

if (!existsSync(join(tempDir, "metadata.nmd"))) {
  await mkdir(tempDir, { recursive: true });
  console.log(`Extracting ${basename(inputPath)} …`);
  execFileSync("unzip", ["-o", "-q", inputPath, "-d", tempDir], { stdio: "inherit" });
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

const files = [];
const binaries = [];
function emit(path, data) {
  files.push({ path, content: `${JSON.stringify(data, null, 2)}\n` });
}

function slugify(value, fallback) {
  const slug = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

// A short, filesystem/id-safe token derived from a source id.
function safe(id) {
  return String(id).replace(/[^A-Za-z0-9]/g, "");
}

function literal(text) {
  return { kind: "literal", value: { type: "text", text: String(text) } };
}

function frag(id, role, binding) {
  return { id, role, binding };
}

function option(id, fragments) {
  return { id, body: fragments };
}

// Parse `<tag:firstValue|key:value|...>` into { tag, value, attrs }.
function parseAngle(line) {
  const inner = line.slice(1, line.lastIndexOf(">"));
  const parts = inner.split("|");
  const [tag, ...rest] = parts[0].split(":");
  const value = rest.join(":");
  const attrs = {};
  for (const part of parts.slice(1)) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    attrs[part.slice(0, idx)] = part.slice(idx + 1);
  }
  return { tag, value, attrs };
}

// Parse `{key:value|key:value|...}` (an exercise) into a flat field map.
function parseBrace(line) {
  const inner = line.slice(1, line.lastIndexOf("}"));
  const fields = {};
  for (const part of inner.split("|")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    fields[part.slice(0, idx)] = part.slice(idx + 1);
  }
  return fields;
}

// Parse a bracket list `[a][b:c][d]` into [{left, right}] where right is
// undefined for single-value entries.
function parseBrackets(value) {
  const out = [];
  const re = /\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(value))) {
    const body = m[1];
    const idx = body.indexOf(":");
    if (idx === -1) out.push({ left: body });
    else out.push({ left: body.slice(0, idx), right: body.slice(idx + 1) });
  }
  return out;
}

// --------------------------------------------------------------------------
// Notes (.ntf) -> Tiptap
// --------------------------------------------------------------------------

function inlineNodes(text) {
  const nodes = [];
  const re = /(\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push({ type: "text", text: text.slice(last, m.index) });
    const tok = m[0];
    nodes.push({ type: "text", text: tok.slice(1, -1), marks: [{ type: "italic" }] });
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  return nodes.filter((n) => n.text.length > 0);
}

function notesDocument(title, ntf, vocab, sentences) {
  const content = [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] },
  ];

  for (const raw of ntf.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const header = /^\^(.+)\^$/.exec(line);
    if (header) {
      const inner = inlineNodes(header[1]);
      if (inner.length) content.push({ type: "heading", attrs: { level: 2 }, content: inner });
      continue;
    }
    const inner = inlineNodes(line);
    if (inner.length) content.push({ type: "paragraph", content: inner });
  }

  if (vocab.length) {
    content.push({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Vocabulary" }],
    });
    content.push({
      type: "bulletList",
      content: vocab.map((v) => ({
        type: "listItem",
        content: [
          { type: "paragraph", content: [{ type: "text", text: `${v.term} — ${v.translation}` }] },
        ],
      })),
    });
  }

  if (sentences.length) {
    content.push({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Example sentences" }],
    });
    content.push({
      type: "bulletList",
      content: sentences.map((s) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: `${s.fi} — ${s.en}` }] }],
      })),
    });
  }

  return { type: "doc", content };
}

// --------------------------------------------------------------------------
// Audio assets
// --------------------------------------------------------------------------

const audioAssets = new Map(); // audioId -> { assetId, dir }
function ensureAudio(audioId, label) {
  if (audioAssets.has(audioId)) return audioAssets.get(audioId).assetId;
  const src = join(tempDir, `${audioId}.mp3`);
  const assetId = `asset_audio_${safe(audioId)}`;
  const dir = `media/assets/audio-${safe(audioId)}`;
  // Name the file after the word it says, not a generic "audio.mp3". The dir is
  // unique per source id, so word-slug collisions across dirs are harmless.
  const fileName = `${slugify(label, safe(audioId))}.mp3`;
  const exists = existsSync(src);
  emit(`${dir}/asset.json`, {
    id: assetId,
    kind: "audio",
    label: label || audioId,
    availability: exists ? "ready" : "placeholder",
    file: exists ? fileName : null,
    ...(exists ? {} : { expectedFile: fileName }),
    mimeType: "audio/mpeg",
  });
  if (exists) binaries.push({ from: src, to: `${dir}/${fileName}` });
  audioAssets.set(audioId, { assetId, dir });
  return assetId;
}

// The archive ships no image binaries — only the icon keys used by ImagePick.
// We still link an image per word so the vocabulary items carry the slot; the
// asset is a placeholder whose expectedFile names the picture to drop in later.
const imageAssets = new Map(); // imageKey -> { assetId, dir }
function ensureImage(imageKey) {
  if (imageAssets.has(imageKey)) return imageAssets.get(imageKey).assetId;
  const assetId = `asset_image_${safe(imageKey)}`;
  const dir = `media/assets/image-${safe(imageKey)}`;
  emit(`${dir}/asset.json`, {
    id: assetId,
    kind: "image",
    label: imageKey,
    availability: "placeholder",
    file: null,
    expectedFile: `${slugify(imageKey, safe(imageKey))}.png`,
    mimeType: "image/png",
  });
  imageAssets.set(imageKey, { assetId, dir });
  return assetId;
}

// Word -> media, learned from the exercises so vocabulary records can reuse the
// same assets. First occurrence wins.
const wordAudioId = new Map(); // finnish word -> audio id (mp3 present in archive)
const wordImageKey = new Map(); // finnish word -> icon key
const IMAGE_PLACEHOLDER = /launchpad|\d{3,}/i; // e.g. "Launchpad_2048x2048"

// --------------------------------------------------------------------------
// Exercise conversion
// --------------------------------------------------------------------------

const stats = { byType: {}, converted: 0, skipped: 0, flashcards: 0 };

// Build a multiple-choice exercise from a prompt string + option texts + the
// index of the correct option.
function multipleChoice(id, promptText, optionTexts, correctIndex, instruction) {
  if (optionTexts.length < 2 || correctIndex < 0) return null;
  const options = optionTexts.map((text, i) =>
    option(`option_${safe(id)}_${i}`, [frag(`frag_${safe(id)}_${i}`, "primary", literal(text))]),
  );
  return {
    id: `exercise_${safe(id)}`,
    type: "multiple-choice",
    ...(instruction ? { instruction } : {}),
    prompt: [frag(`prompt_${safe(id)}`, "primary", literal(promptText))],
    options,
    evaluation: {
      kind: "selected-options",
      select: "one",
      correctOptionIds: [options[correctIndex].id],
    },
  };
}

function matchPairs(id, pairs, promptText, instruction) {
  // pairs: [{ left: fragment, right: fragment }]
  if (pairs.length < 2) return null;
  const left = pairs.map((p, i) => option(`left_${safe(id)}_${i}`, [p.left]));
  const right = pairs.map((p, i) => option(`right_${safe(id)}_${i}`, [p.right]));
  return {
    id: `exercise_${safe(id)}`,
    type: "match-pairs",
    ...(instruction ? { instruction } : {}),
    prompt: [frag(`prompt_${safe(id)}`, "primary", literal(promptText))],
    left,
    right,
    evaluation: {
      kind: "matched-pairs",
      pairs: left.map((l, i) => ({ leftId: l.id, rightId: right[i].id })),
    },
  };
}

function wordOrder(id, promptText, tokenTexts, instruction) {
  if (tokenTexts.length < 2) return null;
  const tokens = tokenTexts.map((text, i) =>
    option(`token_${safe(id)}_${i}`, [frag(`token_${safe(id)}_${i}_f`, "primary", literal(text))]),
  );
  return {
    id: `exercise_${safe(id)}`,
    type: "word-order",
    ...(instruction ? { instruction } : {}),
    prompt: [frag(`prompt_${safe(id)}`, "primary", literal(promptText))],
    tokens,
    evaluation: { kind: "ordered-tokens", correctOrder: tokens.map((t) => t.id) },
  };
}

function fillBlank(id, before, after, bankTexts, correctIndex, promptText) {
  if (bankTexts.length < 2 || correctIndex < 0) return null;
  const bank = bankTexts.map((text, i) =>
    option(`bank_${safe(id)}_${i}`, [frag(`bank_${safe(id)}_${i}_f`, "primary", literal(text))]),
  );
  const stem = [];
  if (before)
    stem.push({ kind: "text", fragment: frag(`stem_${safe(id)}_a`, "primary", literal(before)) });
  stem.push({ kind: "blank", id: `blank_${safe(id)}` });
  if (after)
    stem.push({ kind: "text", fragment: frag(`stem_${safe(id)}_b`, "primary", literal(after)) });
  return {
    id: `exercise_${safe(id)}`,
    type: "fill-blank",
    prompt: [frag(`prompt_${safe(id)}`, "primary", literal(promptText))],
    stem,
    bank,
    evaluation: {
      kind: "filled-blanks",
      blanks: [{ blankId: `blank_${safe(id)}`, correctOptionIds: [bank[correctIndex].id] }],
    },
  };
}

// Convert a single {type:...} exercise into an Asakiri exercise object, or null
// to skip. Returns { exercise, title }.
function convertExercise(fields) {
  const id = fields.id ?? Math.random().toString(36).slice(2);
  const type = fields.type;
  stats.byType[type] = (stats.byType[type] ?? 0) + 1;

  switch (type) {
    case "PickOne":
    case "PickOneMeaning": {
      const opts = parseBrackets(fields.options).map((o) => o.left);
      const correct = opts.indexOf(fields.answer);
      const prompt =
        type === "PickOneMeaning" ? `${fields.question} “${fields.speech}”` : fields.question;
      return {
        exercise: multipleChoice(id, prompt, opts, correct, "Choose the correct answer."),
        title: "Choose the answer",
      };
    }
    case "SpellingPick": {
      const opts = parseBrackets(fields.options).map((o) => o.left);
      const correct = opts.indexOf(fields.answer);
      return {
        exercise: multipleChoice(
          id,
          "Choose the correct spelling.",
          opts,
          correct,
          "Choose the correct spelling.",
        ),
        title: "Spelling",
      };
    }
    case "ImagePick": {
      // Images are icon keys not present in the archive; keep the words as text
      // for the exercise, but remember word -> icon for the vocabulary items.
      for (const o of parseBrackets(fields.options)) {
        if (o.right && !IMAGE_PLACEHOLDER.test(o.right) && !wordImageKey.has(o.left)) {
          wordImageKey.set(o.left, o.right);
        }
      }
      const opts = parseBrackets(fields.options).map((o) => o.left);
      const correct = opts.indexOf(fields.answer);
      return {
        exercise: multipleChoice(id, fields.question, opts, correct, "Choose the matching word."),
        title: "Choose the word",
      };
    }
    case "Match": {
      const pairs = parseBrackets(fields.options)
        .filter((p) => p.right !== undefined)
        .map((p, i) => ({
          left: frag(`ml_${safe(id)}_${i}`, "primary", literal(p.left)),
          right: frag(`mr_${safe(id)}_${i}`, "primary", literal(p.right)),
        }));
      return {
        exercise: matchPairs(id, pairs, "Match each word to its meaning.", "Match the pairs."),
        title: "Match pairs",
      };
    }
    case "AudioMatch": {
      const pairs = parseBrackets(fields.options)
        .filter((p) => p.right !== undefined)
        .map((p, i) => {
          if (!wordAudioId.has(p.left)) wordAudioId.set(p.left, p.right);
          return {
            left: frag(`al_${safe(id)}_${i}`, "audio", {
              kind: "asset",
              assetId: ensureAudio(p.right, p.left),
            }),
            right: frag(`ar_${safe(id)}_${i}`, "primary", literal(p.left)),
          };
        });
      return {
        exercise: matchPairs(
          id,
          pairs,
          "Listen and match each recording to its word.",
          "Match audio to words.",
        ),
        title: "Listen and match",
      };
    }
    case "WriteWords": {
      const tokens = parseBrackets(fields.special).map((t) => t.left);
      return {
        exercise: wordOrder(id, `Translate: ${fields.question}`, tokens, "Arrange the words."),
        title: "Arrange the translation",
      };
    }
    case "PickWords": {
      const tokens = parseBrackets(fields.options).map((t) => t.left);
      // answerviewable holds the correctly spaced translation; reorder tokens.
      const target = String(fields.answerviewable ?? "")
        .split(/\s+/)
        .filter(Boolean);
      const pool = tokens.slice();
      const ordered = [];
      for (const word of target) {
        const idx = pool.indexOf(word);
        if (idx === -1) continue;
        ordered.push(pool.splice(idx, 1)[0]);
      }
      const finalTokens = ordered.length >= 2 ? ordered.concat(pool) : tokens;
      return {
        exercise: wordOrder(id, `Translate: ${fields.question}`, finalTokens, "Arrange the words."),
        title: "Arrange the translation",
      };
    }
    case "PickMissingWord": {
      const opts = parseBrackets(fields.options).map((o) => o.left);
      const correct = opts.indexOf(fields.answer);
      const q = String(fields.question ?? "");
      const blank = /_{2,}(.+?)_{2,}/.exec(q);
      let before = q;
      let after = "";
      if (blank) {
        before = q.slice(0, blank.index).trim();
        after = q.slice(blank.index + blank[0].length).trim();
      }
      return {
        exercise: fillBlank(id, before, after, opts, correct, "Choose the missing word."),
        title: "Fill the blank",
      };
    }
    case "FlashCard": {
      stats.flashcards += 1;
      return { flashcard: { front: fields.front, back: fields.back }, title: `${fields.front}` };
    }
    default:
      return { exercise: null, title: "" };
  }
}

// --------------------------------------------------------------------------
// Read reference data (.vocab / .sentences / .ntf) for a skill id
// --------------------------------------------------------------------------

async function readReference(skillId) {
  const read = async (ext) => {
    const path = join(tempDir, `${skillId}.${ext}`);
    return existsSync(path) ? readFile(path, "utf8") : "";
  };
  const vocabRaw = await read("vocab");
  const sentencesRaw = await read("sentences");
  const ntf = await read("ntf");

  const vocab = [];
  for (const m of vocabRaw.matchAll(/<\{([^}]*)\}\{([^}]*)\}>/g)) {
    vocab.push({ term: m[1], translation: m[2] });
  }
  const sentences = [];
  for (const line of sentencesRaw.split(/\r?\n/)) {
    const idx = line.indexOf("|");
    if (idx === -1) continue;
    sentences.push({ fi: line.slice(0, idx).trim(), en: line.slice(idx + 1).trim() });
  }
  return { vocab, sentences, ntf };
}

// --------------------------------------------------------------------------
// Parse the unit .nml files into a structure
// --------------------------------------------------------------------------

async function parseUnits() {
  const skills = [];
  const unitFiles = (await readdir(tempDir)).filter((f) => /^unit\d+\.nml$/.test(f)).sort();
  for (const file of unitFiles) {
    const text = await readFile(join(tempDir, file), "utf8");
    let skill = null;
    let lesson = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith("<skill:")) {
        const { value, attrs } = parseAngle(line);
        skill = { title: value, description: attrs.description ?? "", id: attrs.id, lessons: [] };
        skills.push(skill);
      } else if (line.startsWith("<lesson:")) {
        const { value, attrs } = parseAngle(line);
        lesson = { number: value, id: attrs.id, exercises: [] };
        if (skill) skill.lessons.push(lesson);
      } else if (line.startsWith("</lesson>")) {
        lesson = null;
      } else if (line.startsWith("{type:") && lesson) {
        lesson.exercises.push(parseBrace(line));
      }
    }
  }
  return skills;
}

// --------------------------------------------------------------------------
// Build the course
// --------------------------------------------------------------------------

const metadata = (await readFile(join(tempDir, "metadata.nmd"), "utf8")).trim();
const meta = parseAngle(metadata).attrs;
const courseTitle = meta.visiblename ?? "Finnish";
const attribution = (meta.attribution ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const skills = await parseUnits();

const lessonEntries = []; // { path, id }
const outline = [];

// Accumulated, deduplicated content for the browsable collections.
const vocabRecords = [];
const vocabSeen = new Set();
const sentenceRecords = [];
const sentenceSeen = new Set();

const usedSlugs = new Set();
function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
  usedSlugs.add(slug);
  return slug;
}

for (const skill of skills) {
  const unitSlug = uniqueSlug(slugify(skill.title, `skill-${safe(skill.id)}`));
  const unitId = `unit_${safe(skill.id)}`;
  const lessonIds = [];
  const ref = await readReference(skill.id);

  for (const v of ref.vocab) {
    const key = `${v.term} ${v.translation}`;
    if (vocabSeen.has(key)) continue;
    vocabSeen.add(key);
    vocabRecords.push({ finnish: v.term, english: v.translation, unit: skill.title });
  }
  for (const s of ref.sentences) {
    const key = `${s.fi} ${s.en}`;
    if (sentenceSeen.has(key)) continue;
    sentenceSeen.add(key);
    sentenceRecords.push({ finnish: s.fi, english: s.en, unit: skill.title });
  }

  // Intro / notes lesson.
  if (ref.ntf.trim() || ref.vocab.length || ref.sentences.length) {
    const lessonSlug = `${unitSlug}/00-notes`;
    const lessonId = `lesson_notes_${safe(skill.id)}`;
    const doc = notesDocument(skill.title, ref.ntf, ref.vocab, ref.sentences);
    emit(`lessons/${lessonSlug}/parts/notes/document.json`, doc);
    emit(`lessons/${lessonSlug}/lesson.json`, {
      id: lessonId,
      title: `${skill.title} — notes`,
      parts: [
        {
          id: `part_notes_${safe(skill.id)}`,
          title: "Notes",
          content: { kind: "tiptap", file: "parts/notes/document.json" },
        },
      ],
    });
    lessonEntries.push({ path: `lessons/${lessonSlug}/lesson.json` });
    lessonIds.push(lessonId);
  }

  // Exercise lessons.
  for (const lesson of skill.lessons) {
    const num = String(lesson.number).padStart(2, "0");
    const lessonSlug = `${unitSlug}/${num}-${safe(lesson.id)}`;
    const lessonId = `lesson_${safe(lesson.id)}`;
    const parts = [];
    let partIndex = 0;

    for (const fields of lesson.exercises) {
      const result = convertExercise(fields);
      partIndex += 1;
      const pnum = String(partIndex).padStart(2, "0");

      if (result.exercise) {
        stats.converted += 1;
        const dir = `parts/${pnum}-${slugify(fields.type, "exercise")}`;
        emit(`lessons/${lessonSlug}/${dir}/exercise.json`, result.exercise);
        parts.push({
          id: `part_${safe(fields.id ?? `${lesson.id}_${partIndex}`)}`,
          title: result.title,
          content: { kind: "exercise", file: `${dir}/exercise.json` },
        });
      } else if (result.flashcard) {
        const dir = `parts/${pnum}-flashcard`;
        emit(`lessons/${lessonSlug}/${dir}/document.json`, {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: String(result.flashcard.back) }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: String(result.flashcard.front) }],
            },
          ],
        });
        parts.push({
          id: `part_${safe(fields.id ?? `${lesson.id}_${partIndex}`)}`,
          title: `Flashcard: ${result.flashcard.back}`,
          content: { kind: "tiptap", file: `${dir}/document.json` },
        });
      } else {
        stats.skipped += 1;
      }
    }

    if (parts.length === 0) continue;
    emit(`lessons/${lessonSlug}/lesson.json`, {
      id: lessonId,
      title: `${skill.title} ${lesson.number}`,
      parts,
    });
    lessonEntries.push({ path: `lessons/${lessonSlug}/lesson.json` });
    lessonIds.push(lessonId);
  }

  outline.push({ id: unitId, title: skill.title, lessonIds });
}

// --------------------------------------------------------------------------
// Collections (browsable Vocabulary + Sentences)
// --------------------------------------------------------------------------

const TEXT_FIELD = (id, name, locale, required) => ({
  id,
  name,
  kind: "text",
  cardinality: "one",
  ...(locale ? { locale } : {}),
  required,
});

const ASSET_FIELD = (id, name, assetKind) => ({
  id,
  name,
  kind: "asset",
  assetKind,
  cardinality: "many",
  required: false,
});

const mediaStats = { pronunciations: 0, images: 0 };

function buildCollection(collectionId, name, description, slug, rows, media) {
  const recordFiles = [];
  rows.forEach((row, i) => {
    const fields = {
      field_finnish: { kind: "text", value: row.finnish },
      field_english: { kind: "text", value: row.english },
      field_unit: { kind: "text", value: row.unit },
    };

    if (media) {
      const audioId = wordAudioId.get(row.finnish);
      if (audioId && existsSync(join(tempDir, `${audioId}.mp3`))) {
        fields.field_pronunciations = {
          kind: "list",
          items: [
            {
              id: `pron_${slug}_${i}`,
              kind: "asset",
              label: `${row.finnish} — pronunciation`,
              locale: "fi",
              assetId: ensureAudio(audioId, row.finnish),
            },
          ],
        };
        mediaStats.pronunciations += 1;
      }
      const imageKey = wordImageKey.get(row.finnish);
      if (imageKey) {
        fields.field_images = {
          kind: "list",
          items: [
            {
              id: `img_${slug}_${i}`,
              kind: "asset",
              label: imageKey,
              assetId: ensureImage(imageKey),
            },
          ],
        };
        mediaStats.images += 1;
      }
    }

    emit(`content/records/${slug}/${i}.json`, { id: `record_${slug}_${i}`, collectionId, fields });
    recordFiles.push(`../records/${slug}/${i}.json`);
  });

  emit(`content/collections/${slug}.json`, {
    id: collectionId,
    name,
    description,
    fields: [
      TEXT_FIELD("field_finnish", "Finnish", "fi", true),
      TEXT_FIELD("field_english", "English", "en", true),
      TEXT_FIELD("field_unit", "Unit", undefined, false),
      ...(media
        ? [
            ASSET_FIELD("field_pronunciations", "Pronunciations", "audio"),
            ASSET_FIELD("field_images", "Images", "image"),
          ]
        : []),
    ],
    recordFiles,
  });
  return `content/collections/${slug}.json`;
}

const collectionPaths = [
  buildCollection(
    "collection_vocabulary",
    "Vocabulary",
    "Every word taught in the course, with its English meaning, pronunciation, and picture.",
    "vocabulary",
    vocabRecords,
    true,
  ),
  buildCollection(
    "collection_sentences",
    "Sentences",
    "Example sentences from the course, with English translations.",
    "sentences",
    sentenceRecords,
    false,
  ),
];

// --------------------------------------------------------------------------
// Manifest
// --------------------------------------------------------------------------

const assetPaths = [...audioAssets.values(), ...imageAssets.values()].map(
  (a) => `${a.dir}/asset.json`,
);

emit("project.json", {
  $comment: "Converted from a Lingonaut .cn3 archive; provisional Asakiri fixture schema.",
  format: "asakiri-example",
  formatVersion: "0.1-draft",
  project: {
    id: `course_${slugify(courseTitle, "finnish")}`,
    title: courseTitle,
    subtitle: "",
    description: "",
    defaultLocale: "en",
    learningLocales: [meta.language ? meta.language.slice(0, 2) : "fi"],
    level: "",
    estimatedLength: `${outline.length} units`,
    license: "",
    copyrightHolder: "",
    copyrightYear: "",
    coverAssetId: null,
    contributors: attribution.map((name, i) => ({
      id: `contributor_${i}`,
      name,
      role: "author",
      links: [],
    })),
    funding: [],
    sponsors: [],
  },
  collections: collectionPaths,
  assets: assetPaths,
  lessons: lessonEntries.map((l) => l.path),
  outline,
  legacy: {
    source: "lingonaut-cn3",
    version: meta.version ?? "",
    flag: meta.flag ?? "",
  },
});

// --------------------------------------------------------------------------
// Write everything
// --------------------------------------------------------------------------

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const { path, content } of files) {
  const full = join(outputRoot, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content);
}
for (const { from, to } of binaries) {
  const full = join(outputRoot, to);
  await mkdir(dirname(full), { recursive: true });
  await cp(from, full);
}

console.log(`\nConverted → ${outputRoot}`);
console.log(`  units:       ${outline.length}`);
console.log(`  lessons:     ${lessonEntries.length}`);
console.log(
  `  exercises:   ${stats.converted} converted, ${stats.flashcards} flashcards, ${stats.skipped} skipped`,
);
console.log(
  `  audio:       ${binaries.length} imported, ${audioAssets.size - binaries.length} missing`,
);
console.log(
  `  collections: vocabulary (${vocabRecords.length}), sentences (${sentenceRecords.length})`,
);
console.log(
  `  linked:      ${mediaStats.pronunciations} pronunciations, ${mediaStats.images} images (${imageAssets.size} placeholder image assets)`,
);
console.log("  by type:", JSON.stringify(stats.byType));
