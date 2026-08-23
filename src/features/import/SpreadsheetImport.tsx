import { useMemo, useState } from "react";
import type { Collection, ContentRecord } from "@core/course";
import type { DocumentTable } from "@core/documents";
import type { ProjectWriteResult } from "@core/project-writing";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Field, TextInput } from "@shared/components/form";
import { Select } from "@shared/components/select";
import { RadioChoice, RadioChoices } from "@shared/components/choice";
import { Progress } from "@shared/components/progress";
import { Status } from "@shared/components/status";
import {
  bodyRows,
  buildPlan,
  defaultMapping,
  primaryFieldId,
  type ColumnTarget,
  type SpreadsheetMapping,
} from "@features/import/spreadsheet-plan";
import type { PlannedField } from "@features/import/spreadsheet-plan";
import styles from "@features/import/SpreadsheetImport.module.css";

export interface SpreadsheetImportRequest {
  readonly collectionId: string | null;
  readonly collectionName: string;
  readonly fields: readonly PlannedField[];
  readonly primaryFieldId: string | null;
  readonly created: readonly ContentRecord[];
  readonly updated: readonly ContentRecord[];
}

export interface SpreadsheetImportProps {
  readonly fileName: string;
  readonly tables: readonly DocumentTable[];
  readonly collections: readonly Collection[];
  readonly records: readonly ContentRecord[];
  readonly locales: readonly string[];
  readonly defaultLocale: string;
  readonly onCancel: () => void;
  readonly onImport: (
    request: SpreadsheetImportRequest,
    onProgress: (written: number) => void,
  ) => Promise<ProjectWriteResult>;
}

const NEW_COLLECTION = "__new__";
const SKIP = "__skip__";
const NO_LOCALE = "__none__";

export function SpreadsheetImport({
  fileName,
  tables,
  collections,
  records,
  locales,
  defaultLocale,
  onCancel,
  onImport,
}: SpreadsheetImportProps) {
  const messages = useMessages();
  const t = messages.importer;
  const format = useFormat();

  const [tableIndex, setTableIndex] = useState(0);
  const table = useMemo(
    () => tables[tableIndex] ?? { headerRows: 0, rows: [] },
    [tables, tableIndex],
  );

  const [target, setTarget] = useState<string>(NEW_COLLECTION);
  const [name, setName] = useState(fileName.replace(/\.[^.]+$/, ""));
  const [mapping, setMapping] = useState<SpreadsheetMapping>(() =>
    defaultMapping(table, defaultLocale),
  );
  const [phase, setPhase] = useState<"mapping" | "running" | "failed">("mapping");
  const [written, setWritten] = useState(0);

  const collection = collections.find((entry) => entry.id === target) ?? null;
  const existing = useMemo(
    () => ({
      collection,
      records: collection ? records.filter((entry) => entry.collectionId === collection.id) : [],
    }),
    [collection, records],
  );

  const plan = useMemo(
    () => buildPlan(table, mapping, existing, collection?.id ?? NEW_COLLECTION),
    [table, mapping, existing, collection],
  );

  const setColumn = (index: number, next: ColumnTarget) => {
    setMapping((current) => ({
      ...current,
      columns: current.columns.map((column, position) =>
        position === index ? { ...column, target: next } : column,
      ),
    }));
  };

  const selectTable = (index: number) => {
    const next = tables[index];
    if (!next) return;
    setTableIndex(index);
    setMapping(defaultMapping(next, defaultLocale));
  };

  const selectTarget = (value: string) => {
    setTarget(value);
    const chosen = collections.find((entry) => entry.id === value);
    setMapping((current) => ({
      ...current,
      columns: current.columns.map((column) => {
        if (!chosen) return column;
        const match = chosen.fields.find(
          (field) => field.name.toLowerCase() === column.header.toLowerCase(),
        );
        return match ? { ...column, target: { kind: "existing", fieldId: match.id } } : column;
      }),
    }));
  };

  const total = plan.created.length + plan.updated.length;

  const run = () => {
    setPhase("running");
    setWritten(0);
    void onImport(
      {
        collectionId: collection?.id ?? null,
        collectionName: name.trim() === "" ? fileName : name.trim(),
        fields: plan.fields,
        primaryFieldId: primaryFieldId(mapping, plan.fields),
        created: plan.created,
        updated: plan.updated,
      },
      setWritten,
    ).then((result) => {
      if (result.status === "saved") onCancel();
      else setPhase("failed");
    });
  };

  const preview = bodyRows(table).slice(0, 3);
  const nothingToDo = total === 0;
  const busy = phase === "running";

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{t.title}</h2>
          <p className={styles.source}>
            {format(t.source, { file: fileName, rows: table.rows.length })}
          </p>
        </div>

        {busy ? (
          <div className={styles.running}>
            <Progress
              value={written}
              max={Math.max(total, 1)}
              label={t.importing}
              detail={format(t.progressDetail, { written, total })}
            />
            <p className={styles.runningNote}>{t.progressNote}</p>
          </div>
        ) : (
          <div className={styles.body}>
            {tables.length > 1 ? (
              <Field label={t.tableLabel}>
                <Select
                  items={tables.map((entry, index) => ({
                    value: String(index),
                    label: format(t.tableOption, { index: index + 1, rows: entry.rows.length }),
                  }))}
                  value={String(tableIndex)}
                  onValueChange={(value) => {
                    selectTable(Number(value));
                  }}
                />
              </Field>
            ) : null}

            <Field label={t.targetLabel} help={t.targetHelp}>
              <Select
                items={[
                  { value: NEW_COLLECTION, label: t.newCollection },
                  ...collections.map((entry) => ({ value: entry.id, label: entry.name })),
                ]}
                value={target}
                onValueChange={selectTarget}
              />
            </Field>

            {collection === null ? (
              <Field label={t.nameLabel}>
                <TextInput
                  value={name}
                  autoComplete="off"
                  onChange={(event) => {
                    setName(event.currentTarget.value);
                  }}
                />
              </Field>
            ) : null}

            <RadioChoices
              aria-label={t.keyHeader}
              value={mapping.keyColumn === null ? "" : String(mapping.keyColumn)}
              onValueChange={(value) => {
                const index = Number(value);
                setMapping((current) => ({ ...current, keyColumn: index, primaryColumn: index }));
              }}
            >
              <table className={styles.columns}>
                <thead>
                  <tr>
                    <th scope="col">{t.columnHeader}</th>
                    <th scope="col">{t.fieldHeader}</th>
                    <th scope="col">{t.localeHeader}</th>
                    <th scope="col">{t.keyHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.columns.map((column, index) => {
                    const sample = preview
                      .map((row) => row[index] ?? "")
                      .find((value) => value !== "");
                    return (
                      <tr key={`${column.header}-${String(index)}`}>
                        <td>
                          <span className={styles.columnName}>
                            {column.header || t.unnamedColumn}
                          </span>
                          <span className={styles.sample}>{sample ?? ""}</span>
                        </td>
                        <td>
                          <Select
                            aria-label={format(t.fieldFor, { column: column.header })}
                            items={[
                              { value: SKIP, label: t.skipColumn },
                              { value: NEW_COLLECTION, label: t.newField },
                              ...(collection?.fields ?? []).map((field) => ({
                                value: field.id,
                                label: field.name,
                              })),
                            ]}
                            value={
                              column.target.kind === "skip"
                                ? SKIP
                                : column.target.kind === "new"
                                  ? NEW_COLLECTION
                                  : column.target.fieldId
                            }
                            onValueChange={(value) => {
                              if (value === SKIP) setColumn(index, { kind: "skip" });
                              else if (value === NEW_COLLECTION)
                                setColumn(index, {
                                  kind: "new",
                                  name: column.header || t.unnamedColumn,
                                  locale: defaultLocale,
                                });
                              else setColumn(index, { kind: "existing", fieldId: value });
                            }}
                          />
                        </td>
                        <td>
                          {column.target.kind === "new" ? (
                            <Select
                              aria-label={format(t.localeFor, { column: column.header })}
                              items={[
                                { value: NO_LOCALE, label: t.noLocale },
                                ...locales.map((locale) => ({ value: locale, label: locale })),
                              ]}
                              value={column.target.locale === "" ? NO_LOCALE : column.target.locale}
                              onValueChange={(value) => {
                                const current = column.target;
                                if (current.kind !== "new") return;
                                setColumn(index, {
                                  ...current,
                                  locale: value === NO_LOCALE ? "" : value,
                                });
                              }}
                            />
                          ) : null}
                        </td>
                        <td>
                          <RadioChoice
                            value={String(index)}
                            disabled={column.target.kind === "skip"}
                          >
                            {t.useAsKey}
                          </RadioChoice>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </RadioChoices>

            <div className={styles.summary} role="status">
              <span>{format(t.summaryCreated, { count: plan.created.length })}</span>
              <span>{format(t.summaryUpdated, { count: plan.updated.length })}</span>
              {plan.unchanged > 0 ? (
                <span>{format(t.summaryUnchanged, { count: plan.unchanged })}</span>
              ) : null}
              {plan.skipped.length > 0 ? (
                <span className={styles.skipped}>
                  {format(t.summarySkipped, { count: plan.skipped.length })}
                </span>
              ) : null}
            </div>

            {mapping.keyColumn === null ? <Status tone="warning">{t.noKeyWarning}</Status> : null}
            {phase === "failed" ? (
              <Status tone="error">{format(t.importFailed, { written, total })}</Status>
            ) : null}
          </div>
        )}

        <div className={styles.actions}>
          {busy ? null : (
            <>
              <Button variant="ghost" onClick={onCancel}>
                {messages.common.cancel}
              </Button>
              <Button disabled={nothingToDo} onClick={run}>
                {phase === "failed" ? t.retry : t.importAction}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
