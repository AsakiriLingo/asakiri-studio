import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { useFormat, useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
import { Icon } from "@shared/components/icon";
import { TextInput } from "@shared/components/form";
import styles from "@shared/components/data-table/DataTable.module.css";

const PAGE_SIZE = 10;

declare module "@tanstack/react-table" {
  // Names must match TanStack's own generics exactly to merge (TS2428); the added
  // members don't reference them, hence the unused-vars suppression.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    readonly primary?: boolean;
    readonly editable?: boolean;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    readonly updateCell?: ((rowIndex: number, columnId: string, value: string) => void) | undefined;
  }
}

function grow(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${String(element.scrollHeight)}px`;
}

type SortDirection = false | "asc" | "desc";

function ariaSort(sorted: SortDirection): "none" | "ascending" | "descending" {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
}

// The chevron points down for descending; rotated up for ascending; dimmed when
// the column is sortable but not the active sort.
function joinSortIcon(sorted: SortDirection): string {
  const classNames = [styles.sortIcon];
  if (sorted) classNames.push(styles.sortIconActive);
  if (sorted === "asc") classNames.push(styles.sortIconAsc);
  return classNames.join(" ");
}

function EditableCell<TData>({ cell }: { readonly cell: Cell<TData, unknown> }) {
  const raw = cell.getValue();
  const initial = typeof raw === "string" ? raw : "";
  const header = cell.column.columnDef.header;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) grow(ref.current);
  }, []);

  const commit = (next: string) => {
    if (next === initial) return;
    cell.getContext().table.options.meta?.updateCell?.(cell.row.index, cell.column.id, next);
  };

  // Uncontrolled auto-growing textarea: the DOM owns the draft (typing never
  // re-renders the table), and it wraps long values instead of clipping them.
  // `key` re-seeds the field when the committed value changes externally.
  return (
    <textarea
      ref={ref}
      key={initial}
      rows={1}
      className={styles.input}
      defaultValue={initial}
      aria-label={typeof header === "string" ? header : undefined}
      onInput={(event) => {
        grow(event.currentTarget);
      }}
      onBlur={(event) => {
        commit(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.currentTarget.value = initial;
          grow(event.currentTarget);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export interface DataTableProps<TData> {
  readonly columns: ColumnDef<TData>[];
  readonly data: readonly TData[];
  readonly ariaLabel?: string;
  readonly searchable?: boolean;
  readonly onEditCell?: (rowIndex: number, columnId: string, value: string) => void;
}

function DataTableInner<TData>({
  columns,
  data,
  ariaLabel,
  searchable,
  onEditCell,
}: DataTableProps<TData>) {
  const messages = useMessages();
  const format = useFormat();
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const rows = useMemo(() => [...data], [data]);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions; React Compiler safely skips this component.
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Keep the current page while editing a cell (editing changes the data).
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    meta: { updateCell: onEditCell },
  });

  const pageCount = table.getPageCount();
  const columnCount = table.getVisibleFlatColumns().length;
  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className={styles.wrap}>
      {searchable ? (
        <div className={styles.toolbar}>
          <span className={styles.search}>
            <Icon name="search" size={16} className={styles.searchIcon} />
            <TextInput
              type="search"
              className={styles.searchInput}
              value={globalFilter}
              placeholder={messages.common.searchPlaceholder}
              aria-label={messages.common.search}
              autoComplete="off"
              onChange={(event) => {
                setGlobalFilter(event.currentTarget.value);
                table.setPageIndex(0);
              }}
            />
          </span>
        </div>
      ) : null}
      <table className={styles.table} aria-label={ariaLabel}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                if (header.isPlaceholder) return <th key={header.id} scope="col" />;
                const content = flexRender(header.column.columnDef.header, header.getContext());
                if (!header.column.getCanSort()) {
                  return (
                    <th key={header.id} scope="col">
                      {content}
                    </th>
                  );
                }
                const sorted = header.column.getIsSorted();
                const label =
                  typeof header.column.columnDef.header === "string"
                    ? header.column.columnDef.header
                    : header.column.id;
                return (
                  <th key={header.id} scope="col" aria-sort={ariaSort(sorted)}>
                    <button
                      type="button"
                      className={styles.sortHeader}
                      aria-label={format(messages.common.sortBy, { column: label })}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {content}
                      <Icon
                        name="chevron-down"
                        size={14}
                        className={joinSortIcon(sorted)}
                        aria-hidden
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {hasRows ? (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cell.column.columnDef.meta?.primary ? styles.primary : undefined}
                  >
                    {cell.column.columnDef.meta?.editable && onEditCell ? (
                      <EditableCell cell={cell} />
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columnCount} className={styles.emptyRow}>
                {messages.common.noResults}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pageCount > 1 ? (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {format(messages.common.pageOf, {
              current: table.getState().pagination.pageIndex + 1,
              total: pageCount,
            })}
          </span>
          <span className={styles.pageControls}>
            <Button
              variant="ghost"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => {
                table.previousPage();
              }}
            >
              {messages.common.previous}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => {
                table.nextPage();
              }}
            >
              {messages.common.next}
            </Button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

// Memoized so unrelated parent state changes (opening a modal, save status) do
// not re-render the whole table. Cast keeps the generic call signature.
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
