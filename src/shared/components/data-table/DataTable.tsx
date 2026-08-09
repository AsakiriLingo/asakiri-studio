import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import styles from "@shared/components/data-table/DataTable.module.css";

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

function EditableCell<TData>({ cell }: { readonly cell: Cell<TData, unknown> }) {
  const raw = cell.getValue();
  const initial = typeof raw === "string" ? raw : "";
  const header = cell.column.columnDef.header;

  const commit = (next: string) => {
    if (next === initial) return;
    cell.getContext().table.options.meta?.updateCell?.(cell.row.index, cell.column.id, next);
  };

  // Uncontrolled input: the DOM owns the draft, so typing never re-renders the
  // table. `key` re-seeds the field when the committed value changes externally.
  return (
    <input
      key={initial}
      className={styles.input}
      defaultValue={initial}
      aria-label={typeof header === "string" ? header : undefined}
      onBlur={(event) => {
        commit(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.currentTarget.value = initial;
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

export function DataTable<TData>({ columns, data, ariaLabel, onEditCell }: DataTableProps<TData>) {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions; React Compiler safely skips this component.
  const table = useReactTable({
    data: [...data],
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { updateCell: onEditCell },
  });

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
    </div>
  );
}
