"use client";

import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

export type BreadcrumbItem = {
  label: string;
  href: string;
  linkProps?: Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "children" | "href"
  >;
};

export type BreadcrumbProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> & {
  items: BreadcrumbItem[];
  currentLabel: string;
  separator?: ReactNode;
  maxItems?: number;
  ariaLabel?: string;
};

type BreadcrumbStructure = {
  leading: BreadcrumbItem[];
  condensed: BreadcrumbItem[];
  trailing: BreadcrumbItem[];
};

const defaultSeparator = "/";

function getBreadcrumbStructure(
  items: BreadcrumbItem[],
  maxItems?: number,
): BreadcrumbStructure {
  const totalItems = items.length + 1;

  if (
    maxItems === undefined ||
    !Number.isFinite(maxItems) ||
    totalItems <= Math.max(1, Math.floor(maxItems)) ||
    items.length <= 1
  ) {
    return {
      leading: items,
      condensed: [],
      trailing: [],
    };
  }

  const normalizedMaxItems = Math.max(3, Math.floor(maxItems));
  const visibleTrailingCount = Math.max(0, normalizedMaxItems - 3);
  const trailingStart = Math.max(1, items.length - visibleTrailingCount);

  return {
    leading: items.slice(0, 1),
    condensed: items.slice(1, trailingStart),
    trailing: items.slice(trailingStart),
  };
}

function navigateTo(href: string): void {
  window.location.assign(href);
}

function BreadcrumbSeparator({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 text-[var(--breadcrumb-separator-foreground)]"
    >
      {children}
    </span>
  );
}

function BreadcrumbLink({ item }: { item: BreadcrumbItem }) {
  const { className, ...linkProps } = item.linkProps ?? {};
  const classes = [
    "block min-w-0 max-w-48 truncate rounded-[var(--breadcrumb-focus-radius)] text-[var(--breadcrumb-foreground)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:text-[var(--breadcrumb-link-hover)] focus-visible:outline-[var(--state-focus-width)] focus-visible:outline-offset-[var(--state-focus-offset)] focus-visible:outline-[var(--color-focus)] motion-reduce:transition-none",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      {...linkProps}
      href={item.href}
      className={classes}
      title={linkProps.title ?? item.label}
    >
      {item.label}
    </a>
  );
}

const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  function Breadcrumb(
    {
      items,
      currentLabel,
      separator = defaultSeparator,
      maxItems,
      ariaLabel = "Navegação estrutural",
      className,
      "aria-label": nativeAriaLabel,
      ...props
    },
    ref,
  ) {
    const { leading, condensed, trailing } = getBreadcrumbStructure(
      items,
      maxItems,
    );
    const classes = ["min-w-0 max-w-full", className]
      .filter(Boolean)
      .join(" ");
    const renderLinkedItem = (item: BreadcrumbItem, index: number) => (
      <li
        key={`${item.href}-${index}`}
        className="flex min-w-0 items-center gap-[var(--breadcrumb-gap)]"
      >
        <BreadcrumbLink item={item} />
        <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
      </li>
    );

    return (
      <nav
        ref={ref}
        {...props}
        aria-label={nativeAriaLabel ?? ariaLabel}
        className={classes}
      >
        <ol className="flex min-w-0 max-w-full items-center gap-[var(--breadcrumb-gap)] overflow-hidden text-[length:var(--breadcrumb-font-size)] leading-[var(--breadcrumb-line-height)]">
          {leading.map(renderLinkedItem)}

          {condensed.length > 0 ? (
            <li className="flex shrink-0 items-center gap-[var(--breadcrumb-gap)]">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex min-h-[var(--layout-touch-target)] min-w-[var(--layout-touch-target)] items-center justify-center rounded-[var(--breadcrumb-focus-radius)] text-[var(--breadcrumb-foreground)] outline-none transition-colors duration-[var(--duration-fast)] ease-[var(--easing-standard)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--breadcrumb-link-hover)] focus-visible:outline-[var(--state-focus-width)] focus-visible:outline-offset-[var(--state-focus-offset)] focus-visible:outline-[var(--color-focus)] motion-reduce:transition-none"
                  aria-label="Mostrar níveis intermediários"
                >
                  <span aria-hidden="true">…</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {condensed.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      onSelect={() => navigateTo(item.href)}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
            </li>
          ) : null}

          {trailing.map((item, index) =>
            renderLinkedItem(item, leading.length + condensed.length + index),
          )}

          <li
            aria-current="page"
            className="min-w-0 truncate font-medium text-[var(--breadcrumb-current-foreground)]"
            title={currentLabel}
          >
            {currentLabel}
          </li>
        </ol>
      </nav>
    );
  },
);

Breadcrumb.displayName = "Breadcrumb";

export default Breadcrumb;
