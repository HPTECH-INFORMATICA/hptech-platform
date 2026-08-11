import {
  forwardRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";

export type TableDensity = "comfortable" | "compact";

export type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  striped?: boolean;
  hoverable?: boolean;
  density?: TableDensity;
};

export type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement>;
export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;
export type TableFooterProps = HTMLAttributes<HTMLTableSectionElement>;

export type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  selected?: boolean;
};

export type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement>;
export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>;
export type TableCaptionProps = HTMLAttributes<HTMLTableCaptionElement>;

const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  {
    striped = false,
    hoverable = true,
    density = "comfortable",
    className,
    ...props
  },
  ref,
) {
  const classes = [
    "w-full border-collapse bg-[var(--table-background)] text-left text-[length:var(--table-font-size)] leading-[var(--table-line-height)] text-[var(--table-foreground)]",
    density === "compact"
      ? "[&_td]:px-[var(--table-cell-padding-x-compact)] [&_td]:py-[var(--table-cell-padding-y-compact)] [&_th]:px-[var(--table-cell-padding-x-compact)] [&_th]:py-[var(--table-cell-padding-y-compact)]"
      : "[&_td]:px-[var(--table-cell-padding-x)] [&_td]:py-[var(--table-cell-padding-y)] [&_th]:px-[var(--table-cell-padding-x)] [&_th]:py-[var(--table-cell-padding-y)]",
    striped
      ? "[&_tbody_tr:nth-child(even):not([data-selected=true])]:bg-[var(--table-row-striped)]"
      : null,
    hoverable
      ? "[&_tbody_tr:not([aria-disabled=true]):hover]:bg-[var(--table-row-hover)]"
      : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <table
      ref={ref}
      {...props}
      data-density={density}
      data-striped={striped ? "true" : undefined}
      data-hoverable={hoverable ? "true" : undefined}
      className={classes}
    />
  );
});

Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(function TableHeader({ className, ...props }, ref) {
  const classes = [
    "border-b border-[var(--table-border)] bg-[var(--table-header-background)] text-[var(--table-header-foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <thead ref={ref} {...props} className={classes} />;
});

TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody({ className, ...props }, ref) {
    const classes = ["[&_tr:last-child]:border-b-0", className]
      .filter(Boolean)
      .join(" ");

    return <tbody ref={ref} {...props} className={classes} />;
  },
);

TableBody.displayName = "TableBody";

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  TableFooterProps
>(function TableFooter({ className, ...props }, ref) {
  const classes = [
    "border-t border-[var(--table-border)] bg-[var(--table-footer-background)] font-medium text-[var(--table-footer-foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <tfoot ref={ref} {...props} className={classes} />;
});

TableFooter.displayName = "TableFooter";

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ selected = false, className, ...props }, ref) {
    const classes = [
      "border-b border-[var(--table-border)] transition-colors duration-[var(--duration-fast)] ease-[var(--easing-standard)] data-[selected=true]:bg-[var(--table-row-selected)] aria-disabled:opacity-[var(--state-disabled-opacity)] motion-reduce:transition-none",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <tr
        ref={ref}
        {...props}
        data-selected={selected ? "true" : undefined}
        className={classes}
      />
    );
  },
);

TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  function TableHead({ className, ...props }, ref) {
    const classes = [
      "h-[var(--table-header-height)] align-middle font-semibold whitespace-nowrap",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <th ref={ref} {...props} className={classes} />;
  },
);

TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell({ className, ...props }, ref) {
    const classes = ["align-middle", className].filter(Boolean).join(" ");

    return <td ref={ref} {...props} className={classes} />;
  },
);

TableCell.displayName = "TableCell";

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  TableCaptionProps
>(function TableCaption({ className, ...props }, ref) {
  const classes = [
    "caption-bottom px-[var(--table-cell-padding-x)] py-[var(--table-caption-padding-y)] text-left text-[var(--table-caption-foreground)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <caption ref={ref} {...props} className={classes} />;
});

TableCaption.displayName = "TableCaption";

export default Table;
