import type { AcceptedValue, Binding, PortableValue, RenderFragment } from "@core/course/binding";
import type {
  Collection,
  ContentRecord,
  FieldCardinality,
  FieldDefinition,
  FieldKind,
  RecordColumn,
  RecordFieldItem,
  RecordFieldValue,
  RecordPresentation,
} from "@core/course/content";
import type { Composition, CompositionBlock, CompositionBlockType } from "@core/course/composition";
import type {
  Contributor,
  Course,
  CourseProject,
  CourseSources,
  FundingLink,
  LoadedCourse,
  OutlineSection,
  Sponsor,
} from "@core/course/course";
import { partSourceKey } from "@core/course/course";
import type { TiptapDocument, TiptapMark, TiptapNode } from "@core/course/document";
import type {
  BlankAnswer,
  BlankSegment,
  ChoiceOption,
  Evaluation,
  Exercise,
  ExerciseFeedback,
  ExercisePresentation,
  ExerciseSettings,
  FilledBlanksEvaluation,
  MatchedPairsEvaluation,
  NormalizationRules,
  OrderedTokensEvaluation,
  SelectedOptionsEvaluation,
  SpokenResponseEvaluation,
  TypedAnswerEvaluation,
} from "@core/course/exercise";
import type { Lesson, Part, PartContent } from "@core/course/lesson";
import type { Asset, AssetAvailability, AssetKind } from "@core/course/media";

export interface CourseFileReader {
  readTextFile(relativePath: string): Promise<string>;
}

export class CourseParseError extends Error {}

const MANIFEST_PATH = "project.json";

function fail(message: string): never {
  throw new CourseParseError(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function obj(value: unknown, context: string): Record<string, unknown> {
  if (!isObject(value)) fail(`${context} must be an object`);
  return value;
}

function str(value: unknown, context: string): string {
  if (typeof value !== "string") fail(`${context} must be a string`);
  return value;
}

function strOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strListOr(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function bool(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") fail(`${context} must be a boolean`);
  return value;
}

function arr(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) fail(`${context} must be an array`);
  return value;
}

function strArr(value: unknown, context: string): string[] {
  return arr(value, context).map((item, index) => str(item, `${context}[${String(index)}]`));
}

function resolvePath(baseFile: string, relativePath: string): string {
  const segments = [...baseFile.split("/").slice(0, -1), ...relativePath.split("/")];
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (resolved.length === 0) fail(`path escapes the course directory: ${relativePath}`);
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/");
}

async function readJson(files: CourseFileReader, path: string): Promise<unknown> {
  const text = await files.readTextFile(path);
  try {
    return JSON.parse(text);
  } catch {
    return fail(`${path} is not valid JSON`);
  }
}

function parseBinding(value: unknown, context: string): Binding {
  const data = obj(value, context);
  const kind = str(data.kind, `${context}.kind`);
  switch (kind) {
    case "record":
      return { kind, recordId: str(data.recordId, `${context}.recordId`) };
    case "field":
      return {
        kind,
        recordId: str(data.recordId, `${context}.recordId`),
        fieldId: str(data.fieldId, `${context}.fieldId`),
      };
    case "item":
      return {
        kind,
        recordId: str(data.recordId, `${context}.recordId`),
        fieldId: str(data.fieldId, `${context}.fieldId`),
        itemId: str(data.itemId, `${context}.itemId`),
      };
    case "asset":
      return { kind, assetId: str(data.assetId, `${context}.assetId`) };
    case "literal":
      if (!("value" in data)) fail(`${context}.value is required`);
      return { kind, value: data.value as PortableValue };
    default:
      return fail(`${context} has unsupported binding kind: ${kind}`);
  }
}

function parseFragment(value: unknown, context: string): RenderFragment {
  const data = obj(value, context);
  return {
    id: str(data.id, `${context}.id`),
    role: str(data.role, `${context}.role`),
    binding: parseBinding(data.binding, `${context}.binding`),
  };
}

function parseFragments(value: unknown, context: string): RenderFragment[] {
  return arr(value, context).map((item, index) =>
    parseFragment(item, `${context}[${String(index)}]`),
  );
}

function parseChoice(value: unknown, context: string): ChoiceOption {
  const data = obj(value, context);
  return {
    id: str(data.id, `${context}.id`),
    body: parseFragments(data.body, `${context}.body`),
  };
}

function parseChoices(value: unknown, context: string): ChoiceOption[] {
  return arr(value, context).map((item, index) =>
    parseChoice(item, `${context}[${String(index)}]`),
  );
}

function parseAcceptedValue(value: unknown, context: string): AcceptedValue {
  const data = obj(value, context);
  return { binding: parseBinding(data.binding, `${context}.binding`) };
}

function parseNormalize(value: unknown): NormalizationRules | undefined {
  if (!isObject(value)) return undefined;
  return {
    ...(typeof value.ignoreCase === "boolean" ? { ignoreCase: value.ignoreCase } : {}),
    ...(typeof value.ignoreWhitespace === "boolean"
      ? { ignoreWhitespace: value.ignoreWhitespace }
      : {}),
    ...(typeof value.ignorePunctuation === "boolean"
      ? { ignorePunctuation: value.ignorePunctuation }
      : {}),
    ...(typeof value.ignoreScript === "boolean" ? { ignoreScript: value.ignoreScript } : {}),
  };
}

function parseBlankAnswer(value: unknown, context: string): BlankAnswer {
  const data = obj(value, context);
  const blankId = str(data.blankId, `${context}.blankId`);
  let accepted: BlankAnswer["accepted"];
  if (isObject(data.accepted)) {
    const normalize = parseNormalize(data.accepted.normalize);
    accepted = {
      values: arr(data.accepted.values, `${context}.accepted.values`).map((item, index) =>
        parseAcceptedValue(item, `${context}.accepted.values[${String(index)}]`),
      ),
      ...(normalize ? { normalize } : {}),
    };
  }
  return {
    blankId,
    ...(data.correctOptionIds !== undefined
      ? { correctOptionIds: strArr(data.correctOptionIds, `${context}.correctOptionIds`) }
      : {}),
    ...(accepted ? { accepted } : {}),
  };
}

function parseEvaluation(value: unknown, context: string): Evaluation {
  const data = obj(value, context);
  const kind = str(data.kind, `${context}.kind`);
  switch (kind) {
    case "selected-options": {
      const evaluation: SelectedOptionsEvaluation = {
        kind,
        correctOptionIds: strArr(data.correctOptionIds, `${context}.correctOptionIds`),
        ...(data.select !== undefined ? { select: data.select as "one" | "many" } : {}),
      };
      return evaluation;
    }
    case "ordered-tokens": {
      const evaluation: OrderedTokensEvaluation = {
        kind,
        correctOrder: strArr(data.correctOrder, `${context}.correctOrder`),
      };
      return evaluation;
    }
    case "matched-pairs": {
      const evaluation: MatchedPairsEvaluation = {
        kind,
        pairs: arr(data.pairs, `${context}.pairs`).map((item, index) => {
          const pair = obj(item, `${context}.pairs[${String(index)}]`);
          return {
            leftId: str(pair.leftId, `${context}.pairs[${String(index)}].leftId`),
            rightId: str(pair.rightId, `${context}.pairs[${String(index)}].rightId`),
          };
        }),
      };
      return evaluation;
    }
    case "filled-blanks": {
      const evaluation: FilledBlanksEvaluation = {
        kind,
        blanks: arr(data.blanks, `${context}.blanks`).map((item, index) =>
          parseBlankAnswer(item, `${context}.blanks[${String(index)}]`),
        ),
      };
      return evaluation;
    }
    case "typed-answer": {
      const normalize = parseNormalize(data.normalize);
      const evaluation: TypedAnswerEvaluation = {
        kind,
        accepted: arr(data.accepted, `${context}.accepted`).map((item, index) =>
          parseAcceptedValue(item, `${context}.accepted[${String(index)}]`),
        ),
        ...(normalize ? { normalize } : {}),
      };
      return evaluation;
    }
    case "spoken-response": {
      const evaluation: SpokenResponseEvaluation = {
        kind,
        strictness: str(data.strictness, `${context}.strictness`) as
          "lenient" | "standard" | "strict",
      };
      return evaluation;
    }
    default:
      return fail(`${context} has unsupported evaluation kind: ${kind}`);
  }
}

function parseSettings(value: Record<string, unknown>): ExerciseSettings {
  return {
    ...(typeof value.slowReplay === "boolean" ? { slowReplay: value.slowReplay } : {}),
    ...(typeof value.allowSkip === "boolean" ? { allowSkip: value.allowSkip } : {}),
    ...(typeof value.showRomaji === "boolean" ? { showRomaji: value.showRomaji } : {}),
  };
}

function parsePresentation(value: Record<string, unknown>): ExercisePresentation {
  return {
    ...(typeof value.layout === "string" ? { layout: value.layout as "list" | "image-grid" } : {}),
  };
}

function parseFeedback(value: Record<string, unknown>, context: string): ExerciseFeedback {
  return {
    ...(Array.isArray(value.correct)
      ? { correct: parseFragments(value.correct, `${context}.correct`) }
      : {}),
    ...(Array.isArray(value.incorrect)
      ? { incorrect: parseFragments(value.incorrect, `${context}.incorrect`) }
      : {}),
    ...(isObject(value.perOption)
      ? {
          perOption: Object.fromEntries(
            Object.entries(value.perOption).map(([key, fragments]) => [
              key,
              parseFragments(fragments, `${context}.perOption.${key}`),
            ]),
          ),
        }
      : {}),
  };
}

function parseBlankSegment(value: unknown, context: string): BlankSegment {
  const data = obj(value, context);
  const kind = str(data.kind, `${context}.kind`);
  if (kind === "text") {
    return { kind, fragment: parseFragment(data.fragment, `${context}.fragment`) };
  }
  if (kind === "blank") {
    return { kind, id: str(data.id, `${context}.id`) };
  }
  return fail(`${context} has unsupported segment kind: ${kind}`);
}

export function parseExercise(value: unknown, context: string): Exercise {
  const data = obj(value, context);
  const type = str(data.type, `${context}.type`);
  const base = {
    id: str(data.id, `${context}.id`),
    prompt: parseFragments(data.prompt, `${context}.prompt`),
    ...(typeof data.instruction === "string" ? { instruction: data.instruction } : {}),
    ...(isObject(data.settings) ? { settings: parseSettings(data.settings) } : {}),
    ...(isObject(data.presentation) ? { presentation: parsePresentation(data.presentation) } : {}),
    ...(isObject(data.feedback)
      ? { feedback: parseFeedback(data.feedback, `${context}.feedback`) }
      : {}),
  };
  const evaluation = parseEvaluation(data.evaluation, `${context}.evaluation`);
  switch (type) {
    case "multiple-choice":
    case "select-image":
      return {
        ...base,
        type,
        options: parseChoices(data.options, `${context}.options`),
        evaluation: evaluation as SelectedOptionsEvaluation,
      };
    case "match-pairs":
      return {
        ...base,
        type,
        left: parseChoices(data.left, `${context}.left`),
        right: parseChoices(data.right, `${context}.right`),
        evaluation: evaluation as MatchedPairsEvaluation,
      };
    case "fill-blank":
      return {
        ...base,
        type,
        stem: arr(data.stem, `${context}.stem`).map((item, index) =>
          parseBlankSegment(item, `${context}.stem[${String(index)}]`),
        ),
        ...(data.bank !== undefined ? { bank: parseChoices(data.bank, `${context}.bank`) } : {}),
        ...(isObject(data.translation)
          ? { translation: parseFragment(data.translation, `${context}.translation`) }
          : {}),
        evaluation: evaluation as FilledBlanksEvaluation,
      };
    case "word-order":
      return {
        ...base,
        type,
        tokens: parseChoices(data.tokens, `${context}.tokens`),
        ...(data.distractors !== undefined
          ? { distractors: parseChoices(data.distractors, `${context}.distractors`) }
          : {}),
        evaluation: evaluation as OrderedTokensEvaluation,
      };
    case "listening":
      return {
        ...base,
        type,
        stimulus: parseFragment(data.stimulus, `${context}.stimulus`),
        answerMode: str(data.answerMode, `${context}.answerMode`) as "select" | "type",
        ...(data.options !== undefined
          ? { options: parseChoices(data.options, `${context}.options`) }
          : {}),
        evaluation: evaluation as SelectedOptionsEvaluation | TypedAnswerEvaluation,
      };
    case "speaking":
      return {
        ...base,
        type,
        target: parseFragment(data.target, `${context}.target`),
        evaluation: evaluation as SpokenResponseEvaluation,
      };
    default:
      return fail(`${context} has unsupported exercise type: ${type}`);
  }
}

function parseMark(value: unknown, context: string): TiptapMark {
  const data = obj(value, context);
  return {
    type: str(data.type, `${context}.type`),
    ...(isObject(data.attrs) ? { attrs: data.attrs } : {}),
  };
}

function parseTiptapNode(value: unknown, context: string): TiptapNode {
  const data = obj(value, context);
  return {
    type: str(data.type, `${context}.type`),
    ...(isObject(data.attrs) ? { attrs: data.attrs } : {}),
    ...(Array.isArray(data.content)
      ? {
          content: data.content.map((child, index) =>
            parseTiptapNode(child, `${context}.content[${String(index)}]`),
          ),
        }
      : {}),
    ...(Array.isArray(data.marks)
      ? {
          marks: data.marks.map((mark, index) =>
            parseMark(mark, `${context}.marks[${String(index)}]`),
          ),
        }
      : {}),
    ...(typeof data.text === "string" ? { text: data.text } : {}),
  };
}

function parseTiptapDocument(value: unknown, context: string): TiptapDocument {
  const node = parseTiptapNode(value, context);
  if (node.type !== "doc") fail(`${context}.type must be "doc"`);
  return node as TiptapDocument;
}

function parseBlock(value: unknown, context: string): CompositionBlock {
  const data = obj(value, context);
  return {
    id: str(data.id, `${context}.id`),
    type: str(data.type, `${context}.type`) as CompositionBlockType,
    binding: parseBinding(data.binding, `${context}.binding`),
    ...(isObject(data.presentation) ? { presentation: data.presentation } : {}),
  };
}

function parseComposition(value: unknown, context: string): Composition {
  const data = obj(value, context);
  return {
    blocks: arr(data.blocks, `${context}.blocks`).map((item, index) =>
      parseBlock(item, `${context}.blocks[${String(index)}]`),
    ),
  };
}

function parseFieldDefinition(value: unknown, context: string): FieldDefinition {
  const data = obj(value, context);
  return {
    id: str(data.id, `${context}.id`),
    name: str(data.name, `${context}.name`),
    kind: str(data.kind, `${context}.kind`) as FieldKind,
    cardinality: str(data.cardinality, `${context}.cardinality`) as FieldCardinality,
    required: bool(data.required, `${context}.required`),
    ...(typeof data.locale === "string" ? { locale: data.locale } : {}),
    ...(typeof data.assetKind === "string" ? { assetKind: data.assetKind as AssetKind } : {}),
  };
}

function parseCollection(
  value: unknown,
  context: string,
): {
  collection: Collection;
  recordFiles: string[];
} {
  const data = obj(value, context);
  const collection: Collection = {
    id: str(data.id, `${context}.id`),
    name: str(data.name, `${context}.name`),
    fields: arr(data.fields, `${context}.fields`).map((item, index) =>
      parseFieldDefinition(item, `${context}.fields[${String(index)}]`),
    ),
    ...(typeof data.description === "string" ? { description: data.description } : {}),
  };
  return { collection, recordFiles: strArr(data.recordFiles, `${context}.recordFiles`) };
}

function parseFieldItem(value: unknown, context: string): RecordFieldItem {
  const data = obj(value, context);
  const id = str(data.id, `${context}.id`);
  const kind = str(data.kind, `${context}.kind`);
  const shared = {
    id,
    ...(typeof data.label === "string" ? { label: data.label } : {}),
    ...(typeof data.locale === "string" ? { locale: data.locale } : {}),
  };
  if (kind === "text") {
    return { ...shared, kind, value: str(data.value, `${context}.value`) };
  }
  if (kind === "asset") {
    return { ...shared, kind, assetId: str(data.assetId, `${context}.assetId`) };
  }
  return fail(`${context} has unsupported item kind: ${kind}`);
}

function parseFieldValue(value: unknown, context: string): RecordFieldValue {
  const data = obj(value, context);
  const kind = str(data.kind, `${context}.kind`);
  if (kind === "text") {
    return { kind, value: str(data.value, `${context}.value`) };
  }
  if (kind === "asset") {
    return { kind, assetId: str(data.assetId, `${context}.assetId`) };
  }
  if (kind === "list") {
    return {
      kind,
      items: arr(data.items, `${context}.items`).map((item, index) =>
        parseFieldItem(item, `${context}.items[${String(index)}]`),
      ),
    };
  }
  return fail(`${context} has unsupported field value kind: ${kind}`);
}

function parseRecordColumn(value: unknown, context: string): RecordColumn {
  const data = obj(value, context);
  return {
    fieldId: str(data.fieldId, `${context}.fieldId`),
    visible: bool(data.visible, `${context}.visible`),
  };
}

function parseRecordPresentation(value: unknown, context: string): RecordPresentation {
  const data = obj(value, context);
  return {
    id: str(data.id, `${context}.id`),
    primaryFieldId: str(data.primaryFieldId, `${context}.primaryFieldId`),
    columns: arr(data.columns, `${context}.columns`).map((item, index) =>
      parseRecordColumn(item, `${context}.columns[${String(index)}]`),
    ),
  };
}

function parseRecord(value: unknown, context: string): ContentRecord {
  const data = obj(value, context);
  const fieldsObject = obj(data.fields, `${context}.fields`);
  const fields: Record<string, RecordFieldValue> = {};
  for (const [fieldId, fieldValue] of Object.entries(fieldsObject)) {
    fields[fieldId] = parseFieldValue(fieldValue, `${context}.fields.${fieldId}`);
  }
  return {
    id: str(data.id, `${context}.id`),
    collectionId: str(data.collectionId, `${context}.collectionId`),
    fields,
    ...(data.presentations !== undefined
      ? {
          presentations: arr(data.presentations, `${context}.presentations`).map((item, index) =>
            parseRecordPresentation(item, `${context}.presentations[${String(index)}]`),
          ),
        }
      : {}),
  };
}

function parseAsset(value: unknown, context: string): Asset {
  const data = obj(value, context);
  return {
    id: str(data.id, `${context}.id`),
    kind: str(data.kind, `${context}.kind`) as AssetKind,
    label: str(data.label, `${context}.label`),
    availability: str(data.availability, `${context}.availability`) as AssetAvailability,
    file: data.file === null ? null : str(data.file, `${context}.file`),
    mimeType: str(data.mimeType, `${context}.mimeType`),
    ...(typeof data.expectedFile === "string" ? { expectedFile: data.expectedFile } : {}),
    ...(isObject(data.metadata) ? { metadata: data.metadata } : {}),
  };
}

function parseContributor(value: unknown): Contributor {
  const data = isObject(value) ? value : {};
  return {
    id: strOr(data.id),
    name: strOr(data.name),
    role: strOr(data.role),
    links: strListOr(data.links),
  };
}

function parseFundingLink(value: unknown): FundingLink {
  const data = isObject(value) ? value : {};
  return { id: strOr(data.id), platform: strOr(data.platform), url: strOr(data.url) };
}

function parseSponsor(value: unknown): Sponsor {
  const data = isObject(value) ? value : {};
  return {
    id: strOr(data.id),
    name: strOr(data.name),
    tier: strOr(data.tier),
    url: strOr(data.url),
  };
}

function parseList<T>(value: unknown, parseItem: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(parseItem) : [];
}

function parseProject(value: unknown, context: string): CourseProject {
  const data = obj(value, context);
  return {
    id: str(data.id, `${context}.id`),
    title: str(data.title, `${context}.title`),
    subtitle: strOr(data.subtitle),
    description: str(data.description, `${context}.description`),
    defaultLocale: str(data.defaultLocale, `${context}.defaultLocale`),
    learningLocales: strArr(data.learningLocales, `${context}.learningLocales`),
    taughtFlag: strOr(data.taughtFlag),
    level: strOr(data.level),
    estimatedLength: strOr(data.estimatedLength),
    license: strOr(data.license),
    copyrightHolder: strOr(data.copyrightHolder),
    copyrightYear: strOr(data.copyrightYear),
    coverAssetId: typeof data.coverAssetId === "string" ? data.coverAssetId : null,
    contributors: parseList(data.contributors, parseContributor),
    funding: parseList(data.funding, parseFundingLink),
    sponsors: parseList(data.sponsors, parseSponsor),
  };
}

function parseOutline(value: unknown, context: string): OutlineSection[] {
  return arr(value, context).map((item, index) => {
    const section = obj(item, `${context}[${String(index)}]`);
    return {
      id: str(section.id, `${context}[${String(index)}].id`),
      title: str(section.title, `${context}[${String(index)}].title`),
      lessonIds: strArr(section.lessonIds, `${context}[${String(index)}].lessonIds`),
    };
  });
}

function parsePartContent(kind: string, body: unknown, context: string): PartContent {
  if (kind === "tiptap") {
    return { kind, document: parseTiptapDocument(body, context) };
  }
  if (kind === "composition") {
    return { kind, composition: parseComposition(body, context) };
  }
  if (kind === "exercise") {
    return { kind, exercise: parseExercise(body, context) };
  }
  return fail(`${context} has unsupported content kind: ${kind}`);
}

async function parsePart(
  files: CourseFileReader,
  value: unknown,
  lessonPath: string,
  index: number,
): Promise<{ part: Part; bodyPath: string }> {
  const context = `${lessonPath} parts[${String(index)}]`;
  const data = obj(value, context);
  const content = obj(data.content, `${context}.content`);
  const contentKind = str(content.kind, `${context}.content.kind`);
  const bodyPath = resolvePath(lessonPath, str(content.file, `${context}.content.file`));
  const body = await readJson(files, bodyPath);
  return {
    part: {
      id: str(data.id, `${context}.id`),
      title: str(data.title, `${context}.title`),
      content: parsePartContent(contentKind, body, bodyPath),
    },
    bodyPath,
  };
}

async function parseLesson(
  files: CourseFileReader,
  lessonPath: string,
): Promise<{ lesson: Lesson; partPaths: Record<string, string> }> {
  const data = obj(await readJson(files, lessonPath), `lesson ${lessonPath}`);
  const parts: Part[] = [];
  const partPaths: Record<string, string> = {};
  for (const [index, part] of arr(data.parts, `${lessonPath} parts`).entries()) {
    const { part: parsed, bodyPath } = await parsePart(files, part, lessonPath, index);
    parts.push(parsed);
    partPaths[parsed.id] = bodyPath;
  }
  return {
    lesson: {
      id: str(data.id, `${lessonPath} id`),
      title: str(data.title, `${lessonPath} title`),
      parts,
    },
    partPaths,
  };
}

export async function parseCourseWithSources(files: CourseFileReader): Promise<LoadedCourse> {
  const manifest = obj(await readJson(files, MANIFEST_PATH), MANIFEST_PATH);
  const project = parseProject(manifest.project, `${MANIFEST_PATH} project`);
  const collectionPaths = strArr(manifest.collections, `${MANIFEST_PATH} collections`).map((path) =>
    resolvePath(MANIFEST_PATH, path),
  );
  const assetPaths = strArr(manifest.assets ?? [], `${MANIFEST_PATH} assets`).map((path) =>
    resolvePath(MANIFEST_PATH, path),
  );
  const lessonPaths = strArr(manifest.lessons ?? [], `${MANIFEST_PATH} lessons`).map((path) =>
    resolvePath(MANIFEST_PATH, path),
  );
  const outline = parseOutline(manifest.outline ?? [], `${MANIFEST_PATH} outline`);

  const collections: Collection[] = [];
  const records: ContentRecord[] = [];
  const collectionSources: Record<string, string> = {};
  const recordSources: Record<string, string> = {};
  for (const collectionPath of collectionPaths) {
    const parsed = parseCollection(await readJson(files, collectionPath), collectionPath);
    collections.push(parsed.collection);
    collectionSources[parsed.collection.id] = collectionPath;
    for (const recordFile of parsed.recordFiles) {
      const recordPath = resolvePath(collectionPath, recordFile);
      const record = parseRecord(await readJson(files, recordPath), recordPath);
      records.push(record);
      recordSources[record.id] = recordPath;
    }
  }

  const assets: Asset[] = [];
  const assetSources: Record<string, string> = {};
  for (const assetPath of assetPaths) {
    const asset = parseAsset(await readJson(files, assetPath), assetPath);
    assets.push(asset);
    assetSources[asset.id] = assetPath;
  }

  const lessons: Lesson[] = [];
  const lessonSources: Record<string, string> = {};
  const partSources: Record<string, string> = {};
  for (const lessonPath of lessonPaths) {
    const { lesson, partPaths } = await parseLesson(files, lessonPath);
    lessons.push(lesson);
    lessonSources[lesson.id] = lessonPath;
    for (const [partId, bodyPath] of Object.entries(partPaths)) {
      partSources[partSourceKey(lesson.id, partId)] = bodyPath;
    }
  }

  const course: Course = { project, collections, records, assets, lessons, outline };
  const sources: CourseSources = {
    project: MANIFEST_PATH,
    collections: collectionSources,
    records: recordSources,
    assets: assetSources,
    lessons: lessonSources,
    parts: partSources,
  };
  return { course, sources };
}

export async function parseCourse(files: CourseFileReader): Promise<Course> {
  return (await parseCourseWithSources(files)).course;
}
