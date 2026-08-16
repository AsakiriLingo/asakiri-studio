import { describe, expect, it } from "vitest";
import type { Collection, ContentRecord } from "@core/course";
import type { DocumentTable } from "@core/documents";
import {
  buildPlan,
  defaultMapping,
  primaryFieldId,
  type SpreadsheetMapping,
} from "@features/import";

const table: DocumentTable = {
  headerRows: 1,
  rows: [
    ["Japanese", "English", "Notes"],
    ["猫", "cat", "common"],
    ["犬", "dog", ""],
    ["", "", ""],
  ],
};

function mappingFor(table: DocumentTable): SpreadsheetMapping {
  return defaultMapping(table, "en");
}

describe("defaultMapping", () => {
  it("maps every headed column to a new field and picks the first as key", () => {
    const mapping = mappingFor(table);

    expect(mapping.columns.map((column) => column.header)).toEqual([
      "Japanese",
      "English",
      "Notes",
    ]);
    expect(mapping.columns.every((column) => column.target.kind === "new")).toBe(true);
    expect(mapping.keyColumn).toBe(0);
    expect(mapping.primaryColumn).toBe(0);
  });

  it("skips columns with no header", () => {
    const mapping = defaultMapping(
      {
        headerRows: 1,
        rows: [
          ["Word", ""],
          ["猫", "x"],
        ],
      },
      "en",
    );

    expect(mapping.columns[1]?.target).toEqual({ kind: "skip" });
    expect(mapping.keyColumn).toBe(0);
  });
});

describe("buildPlan", () => {
  it("creates one record per row and skips empty rows", () => {
    const plan = buildPlan(table, mappingFor(table), { collection: null, records: [] }, "col_1");

    expect(plan.created).toHaveLength(2);
    expect(plan.updated).toHaveLength(0);
    expect(plan.skipped).toEqual([{ row: 4, reason: "empty" }]);
    expect(plan.fields.map((field) => field.definition.name)).toEqual([
      "Japanese",
      "English",
      "Notes",
    ]);
    expect(plan.fields.every((field) => field.isNew)).toBe(true);
  });

  it("carries the locale chosen for each column onto the field", () => {
    const mapping: SpreadsheetMapping = {
      ...mappingFor(table),
      columns: [
        { header: "Japanese", target: { kind: "new", name: "Japanese", locale: "ja" } },
        { header: "English", target: { kind: "new", name: "English", locale: "en" } },
        { header: "Notes", target: { kind: "skip" } },
      ],
    };

    const plan = buildPlan(table, mapping, { collection: null, records: [] }, "col_1");

    expect(plan.fields.map((field) => field.definition.locale)).toEqual(["ja", "en"]);
    const [first] = plan.created;
    expect(Object.keys(first?.fields ?? {})).toHaveLength(2);
  });

  it("updates matching entries instead of duplicating them on re-import", () => {
    const fieldId = "field_japanese";
    const collection: Collection = {
      id: "col_1",
      name: "Vocabulary",
      fields: [
        { id: fieldId, name: "Japanese", kind: "text", cardinality: "one", required: false },
        { id: "field_english", name: "English", kind: "text", cardinality: "one", required: false },
      ],
    };
    const existing: ContentRecord = {
      id: "record_cat",
      collectionId: "col_1",
      fields: {
        [fieldId]: { kind: "text", value: "猫" },
        field_english: { kind: "text", value: "kitten" },
      },
    };
    const mapping: SpreadsheetMapping = {
      columns: [
        { header: "Japanese", target: { kind: "existing", fieldId } },
        { header: "English", target: { kind: "existing", fieldId: "field_english" } },
        { header: "Notes", target: { kind: "skip" } },
      ],
      keyColumn: 0,
      primaryColumn: 0,
    };

    const plan = buildPlan(table, mapping, { collection, records: [existing] }, "col_1");

    expect(plan.created).toHaveLength(1);
    expect(plan.created[0]?.fields[fieldId]).toEqual({ kind: "text", value: "犬" });
    expect(plan.updated).toHaveLength(1);
    expect(plan.updated[0]?.id).toBe("record_cat");
    expect(plan.updated[0]?.fields.field_english).toEqual({ kind: "text", value: "cat" });
  });

  it("counts a row that changes nothing as unchanged", () => {
    const fieldId = "field_japanese";
    const collection: Collection = {
      id: "col_1",
      name: "Vocabulary",
      fields: [
        { id: fieldId, name: "Japanese", kind: "text", cardinality: "one", required: false },
      ],
    };
    const records: ContentRecord[] = [
      { id: "r1", collectionId: "col_1", fields: { [fieldId]: { kind: "text", value: "猫" } } },
      { id: "r2", collectionId: "col_1", fields: { [fieldId]: { kind: "text", value: "犬" } } },
    ];
    const mapping: SpreadsheetMapping = {
      columns: [
        { header: "Japanese", target: { kind: "existing", fieldId } },
        { header: "English", target: { kind: "skip" } },
        { header: "Notes", target: { kind: "skip" } },
      ],
      keyColumn: 0,
      primaryColumn: 0,
    };

    const plan = buildPlan(table, mapping, { collection, records }, "col_1");

    expect(plan.unchanged).toBe(2);
    expect(plan.created).toHaveLength(0);
    expect(plan.updated).toHaveLength(0);
  });

  it("skips rows with a blank or repeated key", () => {
    const messy: DocumentTable = {
      headerRows: 1,
      rows: [
        ["Japanese", "English"],
        ["猫", "cat"],
        ["", "dog"],
        ["猫", "feline"],
      ],
    };

    const plan = buildPlan(messy, mappingFor(messy), { collection: null, records: [] }, "col_1");

    expect(plan.created).toHaveLength(1);
    expect(plan.skipped).toEqual([
      { row: 3, reason: "missingKey" },
      { row: 4, reason: "duplicateKey" },
    ]);
  });

  it("imports every row when no key column is chosen", () => {
    const mapping: SpreadsheetMapping = { ...mappingFor(table), keyColumn: null };

    const plan = buildPlan(table, mapping, { collection: null, records: [] }, "col_1");

    expect(plan.created).toHaveLength(2);
    expect(plan.skipped).toEqual([{ row: 4, reason: "empty" }]);
  });
});

describe("primaryFieldId", () => {
  it("resolves the chosen column to its field, ignoring skipped columns", () => {
    const mapping: SpreadsheetMapping = {
      columns: [
        { header: "Japanese", target: { kind: "skip" } },
        { header: "English", target: { kind: "new", name: "English", locale: "en" } },
        { header: "Notes", target: { kind: "new", name: "Notes", locale: "en" } },
      ],
      keyColumn: 1,
      primaryColumn: 2,
    };
    const plan = buildPlan(table, mapping, { collection: null, records: [] }, "col_1");

    expect(primaryFieldId(mapping, plan.fields)).toBe(plan.fields[1]?.definition.id);
  });
});
