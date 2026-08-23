import type {
  Binding,
  Composition,
  ContentRecord,
  Course,
  CourseSources,
  Exercise,
  Part,
  RecordFieldValue,
  RenderFragment,
  TiptapNode,
} from "@core/course";
import type { ReachableBlob } from "@core/packaging/model";

interface UnknownRefs {
  readonly assetIds: Set<string>;
  readonly recordIds: Set<string>;
}

function fieldAssetIds(field: RecordFieldValue): string[] {
  if (field.kind === "asset") return [field.assetId];
  if (field.kind === "list") {
    return field.items.filter((item) => item.kind === "asset").map((item) => item.assetId);
  }
  return [];
}

function recordAssetIds(record: ContentRecord): string[] {
  return Object.values(record.fields).flatMap(fieldAssetIds);
}

function bindingAssetIds(binding: Binding, records: ReadonlyMap<string, ContentRecord>): string[] {
  switch (binding.kind) {
    case "asset":
      return [binding.assetId];
    case "record": {
      const record = records.get(binding.recordId);
      return record ? recordAssetIds(record) : [];
    }
    case "field": {
      const record = records.get(binding.recordId);
      const field = record?.fields[binding.fieldId];
      return field ? fieldAssetIds(field) : [];
    }
    case "item": {
      const record = records.get(binding.recordId);
      const field = record?.fields[binding.fieldId];
      if (field?.kind !== "list") return [];
      const item = field.items.find((candidate) => candidate.id === binding.itemId);
      return item?.kind === "asset" ? [item.assetId] : [];
    }
    default:
      return [];
  }
}

function fragmentBindings(fragments: readonly RenderFragment[] | undefined): Binding[] {
  return (fragments ?? []).map((fragment) => fragment.binding);
}

function exerciseBindings(exercise: Exercise): Binding[] {
  const bindings: Binding[] = [];
  bindings.push(...fragmentBindings(exercise.prompt));
  bindings.push(...fragmentBindings(exercise.feedback?.correct));
  bindings.push(...fragmentBindings(exercise.feedback?.incorrect));
  for (const fragments of Object.values(exercise.feedback?.perOption ?? {})) {
    bindings.push(...fragmentBindings(fragments));
  }
  const options = (
    choices: readonly { readonly body: readonly RenderFragment[] }[] | undefined,
  ) => {
    for (const choice of choices ?? []) bindings.push(...fragmentBindings(choice.body));
  };
  switch (exercise.type) {
    case "multiple-choice":
    case "select-image":
      options(exercise.options);
      break;
    case "match-pairs":
      options(exercise.left);
      options(exercise.right);
      break;
    case "fill-blank":
      for (const segment of exercise.stem) {
        if (segment.kind === "text") bindings.push(segment.fragment.binding);
      }
      options(exercise.bank);
      if (exercise.translation) bindings.push(exercise.translation.binding);
      for (const blank of exercise.evaluation.blanks) {
        for (const value of blank.accepted?.values ?? []) bindings.push(value.binding);
      }
      break;
    case "word-order":
      options(exercise.tokens);
      options(exercise.distractors);
      break;
    case "listening":
      bindings.push(exercise.stimulus.binding);
      options(exercise.options);
      if (exercise.evaluation.kind === "typed-answer") {
        for (const value of exercise.evaluation.accepted) bindings.push(value.binding);
      }
      break;
    case "speaking":
      bindings.push(exercise.target.binding);
      break;
  }
  return bindings;
}

function compositionBindings(composition: Composition): Binding[] {
  return composition.blocks.map((block) => block.binding);
}

function walkTiptap(node: TiptapNode, assetIds: Set<string>, bindings: Binding[]): void {
  const assetId = node.attrs?.assetId;
  if (typeof assetId === "string" && assetId !== "") assetIds.add(assetId);
  const binding = node.attrs?.binding;
  if (isBinding(binding)) bindings.push(binding);
  for (const child of node.content ?? []) walkTiptap(child, assetIds, bindings);
}

function isBinding(value: unknown): value is Binding {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { kind?: unknown }).kind === "string"
  );
}

function collectUnknown(value: unknown, refs: UnknownRefs): void {
  if (Array.isArray(value)) {
    for (const item of value) collectUnknown(item, refs);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const record = value as Record<string, unknown>;
  if (typeof record.assetId === "string" && record.assetId !== "")
    refs.assetIds.add(record.assetId);
  if (typeof record.recordId === "string" && record.recordId !== "")
    refs.recordIds.add(record.recordId);
  for (const nested of Object.values(record)) collectUnknown(nested, refs);
}

function partAssetIds(part: Part, records: ReadonlyMap<string, ContentRecord>): string[] {
  const content = part.content;
  switch (content.kind) {
    case "tiptap": {
      const assetIds = new Set<string>();
      const bindings: Binding[] = [];
      walkTiptap(content.document, assetIds, bindings);
      for (const binding of bindings) {
        for (const id of bindingAssetIds(binding, records)) assetIds.add(id);
      }
      return [...assetIds];
    }
    case "composition":
      return compositionBindings(content.composition).flatMap((binding) =>
        bindingAssetIds(binding, records),
      );
    case "exercise":
      return exerciseBindings(content.exercise).flatMap((binding) =>
        bindingAssetIds(binding, records),
      );
    case "unknown": {
      const refs: UnknownRefs = { assetIds: new Set(), recordIds: new Set() };
      collectUnknown(content.raw, refs);
      const ids = new Set(refs.assetIds);
      for (const recordId of refs.recordIds) {
        const record = records.get(recordId);
        if (record) for (const id of recordAssetIds(record)) ids.add(id);
      }
      return [...ids];
    }
    default:
      return [];
  }
}

function assetDirectory(assetJsonPath: string): string {
  const slash = assetJsonPath.lastIndexOf("/");
  return slash >= 0 ? assetJsonPath.slice(0, slash) : "";
}

export function collectReachableBlobs(course: Course, sources: CourseSources): ReachableBlob[] {
  const assets = new Map(course.assets.map((asset) => [asset.id, asset]));
  const records = new Map(course.records.map((record) => [record.id, record]));
  const lessons = new Map(course.lessons.map((lesson) => [lesson.id, lesson]));

  const byHash = new Map<
    string,
    {
      byteSize: number;
      mime: string;
      sourceRelativePath: string;
      units: string[];
      seen: Set<string>;
    }
  >();

  const note = (assetId: string, unitId: string | null): void => {
    const asset = assets.get(assetId);
    if (!asset?.file || !asset.sha256 || asset.byteSize === undefined) return;
    const assetJsonPath = sources.assets[asset.id];
    if (assetJsonPath === undefined) return;
    const entry = byHash.get(asset.sha256) ?? {
      byteSize: asset.byteSize,
      mime: asset.mimeType,
      sourceRelativePath: `${assetDirectory(assetJsonPath)}/${asset.file}`,
      units: [],
      seen: new Set<string>(),
    };
    if (unitId !== null && !entry.seen.has(unitId)) {
      entry.seen.add(unitId);
      entry.units.push(unitId);
    }
    byHash.set(asset.sha256, entry);
  };

  for (const section of course.outline) {
    for (const lessonId of section.lessonIds) {
      const lesson = lessons.get(lessonId);
      if (!lesson) continue;
      for (const part of lesson.parts) {
        for (const assetId of partAssetIds(part, records)) note(assetId, section.id);
      }
    }
  }

  if (course.project.coverAssetId) note(course.project.coverAssetId, null);
  if (course.project.taughtFlagAssetId) note(course.project.taughtFlagAssetId, null);

  return [...byHash.entries()].map(([sha256, entry]) => ({
    sha256,
    byteSize: entry.byteSize,
    mime: entry.mime,
    sourceRelativePath: entry.sourceRelativePath,
    referencingUnitIds: entry.units,
  }));
}
