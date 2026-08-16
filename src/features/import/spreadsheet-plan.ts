import type { Collection, ContentRecord, FieldDefinition, RecordFieldValue } from "@core/course";
import type { DocumentTable } from "@core/documents";

export type ColumnTarget =
  | { readonly kind: "skip" }
  | { readonly kind: "new"; readonly name: string; readonly locale: string }
  | { readonly kind: "existing"; readonly fieldId: string };

export interface ColumnMapping {
  readonly header: string;
  readonly target: ColumnTarget;
}

export interface SpreadsheetMapping {
  readonly columns: readonly ColumnMapping[];
  readonly keyColumn: number | null;
  readonly primaryColumn: number;
}

export interface SkippedRow {
  readonly row: number;
  readonly reason: "empty" | "missingKey" | "duplicateKey";
}

export interface PlannedField {
  readonly definition: FieldDefinition;
  readonly isNew: boolean;
}

export interface ImportPlan {
  readonly fields: readonly PlannedField[];
  readonly created: readonly ContentRecord[];
  readonly updated: readonly ContentRecord[];
  readonly unchanged: number;
  readonly skipped: readonly SkippedRow[];
}

export interface ExistingContent {
  readonly collection: Collection | null;
  readonly records: readonly ContentRecord[];
}

function newFieldId(): string {
  return `field_${crypto.randomUUID()}`;
}

function newRecordId(): string {
  return `record_${crypto.randomUUID()}`;
}

export function headerRow(table: DocumentTable): readonly string[] {
  return table.headerRows > 0 ? (table.rows[0] ?? []) : [];
}

export function bodyRows(table: DocumentTable): readonly (readonly string[])[] {
  return table.rows.slice(table.headerRows > 0 ? table.headerRows : 0);
}

export function defaultMapping(table: DocumentTable, defaultLocale: string): SpreadsheetMapping {
  const headers = headerRow(table);
  const width = Math.max(headers.length, ...bodyRows(table).map((row) => row.length), 0);
  const columns: ColumnMapping[] = [];
  for (let index = 0; index < width; index += 1) {
    const header = headers[index]?.trim() ?? "";
    columns.push({
      header,
      target:
        header === "" ? { kind: "skip" } : { kind: "new", name: header, locale: defaultLocale },
    });
  }
  const firstMapped = columns.findIndex((column) => column.target.kind !== "skip");
  return {
    columns,
    keyColumn: firstMapped === -1 ? null : firstMapped,
    primaryColumn: firstMapped === -1 ? 0 : firstMapped,
  };
}

function textValue(value: string): RecordFieldValue {
  return { kind: "text", value };
}

function cell(row: readonly string[], index: number): string {
  return (row[index] ?? "").trim();
}

function fieldsFor(
  mapping: SpreadsheetMapping,
  existing: Collection | null,
): { readonly planned: PlannedField[]; readonly fieldIdByColumn: Map<number, string> } {
  const planned: PlannedField[] = [];
  const fieldIdByColumn = new Map<number, string>();

  mapping.columns.forEach((column, index) => {
    const target = column.target;
    if (target.kind === "skip") return;
    if (target.kind === "existing") {
      const definition = existing?.fields.find((field) => field.id === target.fieldId);
      if (!definition) return;
      fieldIdByColumn.set(index, definition.id);
      planned.push({ definition, isNew: false });
      return;
    }
    const id = newFieldId();
    fieldIdByColumn.set(index, id);
    planned.push({
      definition: {
        id,
        name: target.name,
        kind: "text",
        cardinality: "one",
        required: false,
        ...(target.locale === "" ? {} : { locale: target.locale }),
      },
      isNew: true,
    });
  });

  return { planned, fieldIdByColumn };
}

export function buildPlan(
  table: DocumentTable,
  mapping: SpreadsheetMapping,
  existing: ExistingContent,
  collectionId: string,
): ImportPlan {
  const { planned, fieldIdByColumn } = fieldsFor(mapping, existing.collection);
  const created: ContentRecord[] = [];
  const updated: ContentRecord[] = [];
  const skipped: SkippedRow[] = [];
  const seenKeys = new Set<string>();
  let unchanged = 0;

  const keyFieldId =
    mapping.keyColumn === null ? undefined : fieldIdByColumn.get(mapping.keyColumn);

  const existingByKey = new Map<string, ContentRecord>();
  if (keyFieldId !== undefined) {
    for (const record of existing.records) {
      const value = record.fields[keyFieldId];
      if (value?.kind === "text") existingByKey.set(value.value.trim(), record);
    }
  }

  bodyRows(table).forEach((row, index) => {
    const rowNumber = index + table.headerRows + 1;
    const values: Record<string, RecordFieldValue> = {};
    let hasValue = false;

    for (const [column, fieldId] of fieldIdByColumn) {
      const value = cell(row, column);
      if (value !== "") hasValue = true;
      values[fieldId] = textValue(value);
    }

    if (!hasValue) {
      skipped.push({ row: rowNumber, reason: "empty" });
      return;
    }

    if (mapping.keyColumn !== null) {
      const key = cell(row, mapping.keyColumn);
      if (key === "") {
        skipped.push({ row: rowNumber, reason: "missingKey" });
        return;
      }
      if (seenKeys.has(key)) {
        skipped.push({ row: rowNumber, reason: "duplicateKey" });
        return;
      }
      seenKeys.add(key);

      const match = existingByKey.get(key);
      if (match) {
        const next: ContentRecord = { ...match, fields: { ...match.fields, ...values } };
        if (JSON.stringify(next.fields) === JSON.stringify(match.fields)) unchanged += 1;
        else updated.push(next);
        return;
      }
    }

    created.push({
      id: newRecordId(),
      collectionId,
      fields: values,
      presentations: [],
    });
  });

  return { fields: planned, created, updated, unchanged, skipped };
}

export function primaryFieldId(
  mapping: SpreadsheetMapping,
  fields: readonly PlannedField[],
): string | null {
  let mappedIndex = -1;
  for (let index = 0; index < mapping.columns.length; index += 1) {
    if (mapping.columns[index]?.target.kind === "skip") continue;
    mappedIndex += 1;
    if (index === mapping.primaryColumn) return fields[mappedIndex]?.definition.id ?? null;
  }
  return fields[0]?.definition.id ?? null;
}
