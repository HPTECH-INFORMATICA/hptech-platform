"use client";

import {
  forwardRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from "react";

import Checkbox from "@/components/ui/Checkbox";
import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import EmptyState from "@/components/ui/EmptyState";
import ScrollArea from "@/components/ui/ScrollArea";
import Skeleton from "@/components/ui/Skeleton";
import Table, {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type TableDensity,
} from "@/components/ui/Table";

export type DataGridSortDirection = "asc" | "desc";

export type DataGridSort = {
  columnId: string;
  direction: DataGridSortDirection;
};

export type DataGridCellContext<T> = {
  row: T;
  rowId: string;
  value: unknown;
};

export type DataGridColumn<T> = {
  id: string;
  header: ReactNode;
  headerAriaLabel?: string;
  getValue?: (row: T) => unknown;
  renderCell?: (context: DataGridCellContext<T>) => ReactNode;
  getSortValue?: (row: T) => string | number | Date | null | undefined;
  sortable?: boolean;
  hideable?: boolean;
  defaultVisible?: boolean;
  width?: string | number;
  minWidth?: string | number;
  align?: "start" | "center" | "end";
};

export type DataGridProps<T> = {
  rows: readonly T[];
  columns: readonly DataGridColumn<T>[];
  getRowId: (row: T) => string;
  getRowLabel?: (row: T) => string;
  sort?: DataGridSort | null;
  defaultSort?: DataGridSort | null;
  onSortChange?: (sort: DataGridSort | null) => void;
  manualSorting?: boolean;
  selectionMode?: "none" | "multiple";
  selectedRowIds?: readonly string[];
  defaultSelectedRowIds?: readonly string[];
  onSelectedRowIdsChange?: (ids: readonly string[]) => void;
  isRowDisabled?: (row: T) => boolean;
  columnVisibility?: Readonly<Record<string, boolean>>;
  defaultColumnVisibility?: Readonly<Record<string, boolean>>;
  onColumnVisibilityChange?: (
    visibility: Readonly<Record<string, boolean>>,
  ) => void;
  loading?: boolean;
  loadingRowCount?: number;
  emptyState?: ReactNode;
  density?: TableDensity;
  striped?: boolean;
  caption?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

type IndexedRow<T> = {
  row: T;
  rowId: string;
  originalIndex: number;
};

function normalizeLoadingRowCount(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 5;
}

function getHeaderLabel<T>(column: DataGridColumn<T>): string {
  if (column.headerAriaLabel) return column.headerAriaLabel;
  if (typeof column.header === "string") return column.header;
  return column.id;
}

function getInitialVisibility<T>(
  columns: readonly DataGridColumn<T>[],
  initialVisibility: Readonly<Record<string, boolean>> | undefined,
): Record<string, boolean> {
  return Object.fromEntries(
    columns.map((column) => [
      column.id,
      column.hideable === false
        ? true
        : (initialVisibility?.[column.id] ?? column.defaultVisible ?? true),
    ]),
  );
}

function compareValues(left: unknown, right: unknown): number {
  if (Object.is(left, right)) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  const normalizedLeft = left instanceof Date ? left.getTime() : left;
  const normalizedRight = right instanceof Date ? right.getTime() : right;

  if (
    typeof normalizedLeft === "number" &&
    typeof normalizedRight === "number"
  ) {
    return normalizedLeft - normalizedRight;
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function getNextSort(
  currentSort: DataGridSort | null,
  columnId: string,
): DataGridSort | null {
  if (currentSort?.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (currentSort.direction === "asc") {
    return { columnId, direction: "desc" };
  }
  return null;
}

function getAlignmentClass(alignment: DataGridColumn<unknown>["align"]): string {
  if (alignment === "center") return "text-center";
  if (alignment === "end") return "text-right";
  return "text-left";
}

function getColumnStyle<T>(column: DataGridColumn<T>): CSSProperties {
  return {
    width: column.width,
    minWidth: column.minWidth,
  };
}

function DataGridInner<T>(
  {
    rows,
    columns,
    getRowId,
    getRowLabel,
    sort,
    defaultSort = null,
    onSortChange,
    manualSorting = false,
    selectionMode = "none",
    selectedRowIds,
    defaultSelectedRowIds = [],
    onSelectedRowIdsChange,
    isRowDisabled,
    columnVisibility,
    defaultColumnVisibility,
    onColumnVisibilityChange,
    loading = false,
    loadingRowCount = 5,
    emptyState,
    density = "comfortable",
    striped = false,
    caption,
    ariaLabel = "Grade de dados",
    className,
  }: DataGridProps<T>,
  ref: ForwardedRef<HTMLTableElement>,
) {
  const [isSortControlled] = useState(() => sort !== undefined);
  const [internalSort, setInternalSort] = useState<DataGridSort | null>(
    defaultSort,
  );
  const resolvedSort = isSortControlled ? (sort ?? null) : internalSort;

  const [isSelectionControlled] = useState(
    () => selectedRowIds !== undefined,
  );
  const [internalSelectedRowIds, setInternalSelectedRowIds] = useState<
    readonly string[]
  >(() => Array.from(new Set(defaultSelectedRowIds)));
  const resolvedSelectedRowIds = isSelectionControlled
    ? (selectedRowIds ?? [])
    : internalSelectedRowIds;
  const selectedIds = new Set(resolvedSelectedRowIds);

  const [isVisibilityControlled] = useState(
    () => columnVisibility !== undefined,
  );
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<
    Record<string, boolean>
  >(() => getInitialVisibility(columns, defaultColumnVisibility));
  const resolvedColumnVisibility = isVisibilityControlled
    ? (columnVisibility ?? {})
    : internalColumnVisibility;

  const columnIds = new Set<string>();
  for (const column of columns) {
    if (columnIds.has(column.id)) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(`DataGrid recebeu column id duplicado: "${column.id}".`);
      }
      continue;
    }
    columnIds.add(column.id);
  }

  const indexedRows: IndexedRow<T>[] = [];
  const rowIds = new Set<string>();
  rows.forEach((row, originalIndex) => {
    const rowId = getRowId(row);
    if (rowIds.has(rowId)) {
      if (process.env.NODE_ENV !== "production") {
        throw new Error(`DataGrid recebeu row id duplicado: "${rowId}".`);
      }
      return;
    }
    rowIds.add(rowId);
    indexedRows.push({ row, rowId, originalIndex });
  });

  const visibleColumns = columns.filter(
    (column) =>
      column.hideable === false || resolvedColumnVisibility[column.id] !== false,
  );

  const renderedRows = [...indexedRows];
  const sortedColumn = resolvedSort
    ? columns.find(
        (column) => column.id === resolvedSort.columnId && column.sortable,
      )
    : undefined;

  if (!manualSorting && resolvedSort && sortedColumn) {
    const direction = resolvedSort.direction === "asc" ? 1 : -1;
    renderedRows.sort((left, right) => {
      const leftValue = sortedColumn.getSortValue
        ? sortedColumn.getSortValue(left.row)
        : sortedColumn.getValue?.(left.row);
      const rightValue = sortedColumn.getSortValue
        ? sortedColumn.getSortValue(right.row)
        : sortedColumn.getValue?.(right.row);
      const comparison = compareValues(leftValue, rightValue);
      return comparison === 0
        ? left.originalIndex - right.originalIndex
        : comparison * direction;
    });
  }

  const enabledRenderedRowIds = renderedRows
    .filter(({ row }) => !isRowDisabled?.(row))
    .map(({ rowId }) => rowId);
  const selectedEnabledCount = enabledRenderedRowIds.filter((rowId) =>
    selectedIds.has(rowId),
  ).length;
  const allEnabledSelected =
    enabledRenderedRowIds.length > 0 &&
    selectedEnabledCount === enabledRenderedRowIds.length;
  const someEnabledSelected =
    selectedEnabledCount > 0 && !allEnabledSelected;
  const totalColumnCount = visibleColumns.length +
    (selectionMode === "multiple" ? 1 : 0);

  function requestSort(column: DataGridColumn<T>): void {
    if (!column.sortable) return;
    const nextSort = getNextSort(resolvedSort, column.id);
    if (!isSortControlled) setInternalSort(nextSort);
    onSortChange?.(nextSort);
  }

  function requestSelection(nextIds: readonly string[]): void {
    const uniqueIds = Array.from(new Set(nextIds));
    if (!isSelectionControlled) setInternalSelectedRowIds(uniqueIds);
    onSelectedRowIdsChange?.(uniqueIds);
  }

  function toggleRow(rowId: string): void {
    const nextIds = new Set(selectedIds);
    if (nextIds.has(rowId)) nextIds.delete(rowId);
    else nextIds.add(rowId);
    requestSelection(Array.from(nextIds));
  }

  function toggleAllRenderedRows(): void {
    const nextIds = new Set(selectedIds);
    if (allEnabledSelected) {
      enabledRenderedRowIds.forEach((rowId) => nextIds.delete(rowId));
    } else {
      enabledRenderedRowIds.forEach((rowId) => nextIds.add(rowId));
    }
    requestSelection(Array.from(nextIds));
  }

  function requestColumnVisibility(columnId: string, visible: boolean): void {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column || column.hideable === false) return;

    const nextVisibility = {
      ...resolvedColumnVisibility,
      [columnId]: visible,
    };
    const visibleContentCount = columns.filter(
      (candidate) =>
        candidate.hideable === false || nextVisibility[candidate.id] !== false,
    ).length;
    if (visibleContentCount === 0) return;

    if (!isVisibilityControlled) setInternalColumnVisibility(nextVisibility);
    onColumnVisibilityChange?.(nextVisibility);
  }

  const configurableColumns = columns.filter(
    (column) => column.hideable !== false,
  );
  const gridClasses = ["min-w-0 space-y-[var(--data-grid-gap)]", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={gridClasses}>
      {configurableColumns.length > 0 ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex min-h-[var(--layout-touch-target)] items-center justify-center rounded-[var(--data-grid-control-radius)] border border-[var(--data-grid-border)] bg-[var(--data-grid-control-background)] px-[var(--data-grid-control-padding-x)] text-sm font-medium text-[var(--data-grid-foreground)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--data-grid-control-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
              Configurar colunas
            </DropdownMenuTrigger>
            <DropdownMenuContent
              role="group"
              aria-label="Visibilidade das colunas"
              className="space-y-[var(--space-1)]"
            >
              {configurableColumns.map((column) => {
                const visible = resolvedColumnVisibility[column.id] !== false;
                const visibleContentCount = visibleColumns.length;
                const cannotHideLast = visible && visibleContentCount === 1;

                return (
                  <Checkbox
                    key={column.id}
                    label={getHeaderLabel(column)}
                    checked={visible}
                    disabled={cannotHideLast}
                    className="px-[var(--space-2)]"
                    onChange={(event) =>
                      requestColumnVisibility(column.id, event.target.checked)
                    }
                  />
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <ScrollArea
        orientation="horizontal"
        viewportClassName="pb-[var(--data-grid-scroll-padding)]"
      >
        <div className="min-w-max overflow-hidden rounded-[var(--data-grid-radius)] border border-[var(--data-grid-border)]">
          <Table
            ref={ref}
            density={density}
            striped={striped}
            aria-label={ariaLabel}
            aria-busy={loading || undefined}
          >
            {caption ? <TableCaption>{caption}</TableCaption> : null}
            <TableHeader>
              <TableRow>
                {selectionMode === "multiple" ? (
                  <TableHead scope="col" className="w-[var(--data-grid-selection-width)]">
                    <Checkbox
                      label={<span className="sr-only">Selecionar todas as linhas exibidas</span>}
                      checked={allEnabledSelected}
                      indeterminate={someEnabledSelected}
                      disabled={loading || enabledRenderedRowIds.length === 0}
                      className="w-auto"
                      onChange={toggleAllRenderedRows}
                    />
                  </TableHead>
                ) : null}

                {visibleColumns.map((column) => {
                  const activeSort = resolvedSort?.columnId === column.id
                    ? resolvedSort.direction
                    : null;
                  const alignment = getAlignmentClass(column.align);

                  return (
                    <TableHead
                      key={column.id}
                      scope="col"
                      style={getColumnStyle(column)}
                      className={alignment}
                      aria-sort={
                        column.sortable
                          ? activeSort === "asc"
                            ? "ascending"
                            : activeSort === "desc"
                              ? "descending"
                              : "none"
                          : undefined
                      }
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          className="inline-flex min-h-[var(--layout-touch-target)] items-center gap-[var(--data-grid-sort-gap)] rounded-[var(--data-grid-control-radius)] px-[var(--space-1)] text-inherit outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                          aria-label={`Ordenar por ${getHeaderLabel(column)}`}
                          onClick={() => requestSort(column)}
                        >
                          <span>{column.header}</span>
                          <span
                            aria-hidden="true"
                            className="text-[var(--data-grid-sort-indicator)]"
                          >
                            {activeSort === "asc"
                              ? "↑"
                              : activeSort === "desc"
                                ? "↓"
                                : "↕"}
                          </span>
                        </button>
                      ) : (
                        column.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading
                ? Array.from(
                    { length: normalizeLoadingRowCount(loadingRowCount) },
                    (_, rowIndex) => (
                      <TableRow key={`loading-${rowIndex}`}>
                        {selectionMode === "multiple" ? (
                          <TableCell><Skeleton variant="rectangular" height={20} /></TableCell>
                        ) : null}
                        {visibleColumns.map((column) => (
                          <TableCell key={column.id}>
                            <Skeleton variant="text" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ),
                  )
                : renderedRows.map(({ row, rowId }, rowIndex) => {
                    const rowDisabled = Boolean(isRowDisabled?.(row));
                    const rowSelected = selectedIds.has(rowId);
                    const rowLabel = getRowLabel?.(row) ?? `linha ${rowIndex + 1}`;

                    return (
                      <TableRow
                        key={rowId}
                        selected={rowSelected}
                        aria-selected={
                          selectionMode === "multiple" ? rowSelected : undefined
                        }
                        aria-disabled={rowDisabled || undefined}
                      >
                        {selectionMode === "multiple" ? (
                          <TableCell>
                            <Checkbox
                              label={<span className="sr-only">Selecionar {rowLabel}</span>}
                              checked={rowSelected}
                              disabled={rowDisabled}
                              className="w-auto"
                              onChange={() => toggleRow(rowId)}
                            />
                          </TableCell>
                        ) : null}

                        {visibleColumns.map((column) => {
                          const value = column.getValue?.(row);
                          return (
                            <TableCell
                              key={column.id}
                              style={getColumnStyle(column)}
                              className={getAlignmentClass(column.align)}
                            >
                              {column.renderCell
                                ? column.renderCell({ row, rowId, value })
                                : value == null
                                  ? null
                                  : String(value)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}

              {!loading && renderedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(1, totalColumnCount)}>
                    {emptyState ?? (
                      <EmptyState
                        title="Nenhum registro encontrado"
                        description="Não há dados para exibir neste momento."
                        size="sm"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}

const DataGrid = forwardRef(DataGridInner) as <T>(
  props: DataGridProps<T> & RefAttributes<HTMLTableElement>,
) => ReactElement | null;

export default DataGrid;
