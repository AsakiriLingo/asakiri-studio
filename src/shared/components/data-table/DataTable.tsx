import { memo, useEffect, useRef } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { useMessages } from "@shared/i18n";
import { Button } from "@shared/components/button";
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
  readonly onEditCell?: (rowIndex: number, columnId: string, value: string) => void;
}

function DataTableInner<TData>({ columns, data, ariaLabel, onEditCell }: DataTableProps<TData>) {
  const messages = useMessages();
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions; React Compiler safely skips this component.
  const table = useReactTable({
    data: [...data],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Keep the current page while editing a cell (editing changes the data).
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    meta: { updateCell: onEditCell },
  });

  const pageCount = table.getPageCount();

  return (
    <div className={styles.wrap}>
      <table className={styles.table} aria-label={ariaLabel}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} scope="col">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
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
          ))}
        </tbody>
      </table>
      {pageCount > 1 ? (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {messages.common.pageOf(table.getState().pagination.pageIndex + 1, pageCount)}
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
