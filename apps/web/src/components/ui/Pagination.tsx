"use client";

import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";

type PaginationToken = number | "start-ellipsis" | "end-ellipsis";

export type PaginationProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> & {
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  totalPages: number;
  siblingCount?: number;
  boundaryCount?: number;
  disabled?: boolean;
  showFirstLast?: boolean;
  showPreviousNext?: boolean;
  ariaLabel?: string;
};

function normalizeCount(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function normalizeTotalPages(totalPages: number): number {
  return Number.isFinite(totalPages)
    ? Math.max(1, Math.floor(totalPages))
    : 1;
}

function normalizePage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(totalPages, Math.max(1, Math.floor(page)));
}

function addRange(target: Set<number>, start: number, end: number): void {
  for (let page = start; page <= end; page += 1) {
    target.add(page);
  }
}

function getPaginationTokens(
  page: number,
  totalPages: number,
  siblingCount: number,
  boundaryCount: number,
): PaginationToken[] {
  const pages = new Set<number>();

  addRange(pages, 1, Math.min(boundaryCount, totalPages));
  addRange(
    pages,
    Math.max(1, totalPages - boundaryCount + 1),
    totalPages,
  );
  addRange(
    pages,
    Math.max(1, page - siblingCount),
    Math.min(totalPages, page + siblingCount),
  );

  const selectedPages = Array.from(pages).sort((left, right) => left - right);
  const tokens: PaginationToken[] = [];
  let previousPage = 0;

  selectedPages.forEach((selectedPage) => {
    const gap = selectedPage - previousPage;

    if (gap === 2) {
      tokens.push(previousPage + 1);
    } else if (gap > 2) {
      tokens.push("start-ellipsis");
    }

    tokens.push(selectedPage);
    previousPage = selectedPage;
  });

  const finalGap = totalPages - previousPage;
  if (finalGap === 1) {
    tokens.push(totalPages);
  } else if (finalGap > 1) {
    tokens.push("end-ellipsis");
  }

  return tokens;
}

function PaginationEllipsis({ position }: { position: "start" | "end" }) {
  return (
    <span
      className="inline-flex size-[var(--pagination-item-size)] items-center justify-center text-[var(--pagination-foreground)]"
      title={
        position === "start"
          ? "Páginas anteriores omitidas"
          : "Páginas seguintes omitidas"
      }
    >
      <span aria-hidden="true">…</span>
      <span className="sr-only">
        {position === "start"
          ? "Páginas anteriores omitidas"
          : "Páginas seguintes omitidas"}
      </span>
    </span>
  );
}

function PaginationIcon({ children }: { children: ReactNode }) {
  return <span className="text-lg leading-none">{children}</span>;
}

const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    {
      page,
      defaultPage = 1,
      onPageChange,
      totalPages,
      siblingCount = 1,
      boundaryCount = 1,
      disabled = false,
      showFirstLast = true,
      showPreviousNext = true,
      ariaLabel = "Navegação de páginas",
      className,
      "aria-label": nativeAriaLabel,
      ...props
    },
    ref,
  ) {
    const [isControlled] = useState(() => page !== undefined);
    const normalizedTotalPages = normalizeTotalPages(totalPages);
    const [uncontrolledPage, setUncontrolledPage] = useState(() =>
      normalizePage(defaultPage, normalizedTotalPages),
    );
    const controlledPage = normalizePage(page ?? 1, normalizedTotalPages);
    const normalizedUncontrolledPage = normalizePage(
      uncontrolledPage,
      normalizedTotalPages,
    );
    const resolvedPage = isControlled
      ? controlledPage
      : normalizedUncontrolledPage;
    const normalizedSiblingCount = normalizeCount(siblingCount, 1);
    const normalizedBoundaryCount = normalizeCount(boundaryCount, 1);
    const tokens = getPaginationTokens(
      resolvedPage,
      normalizedTotalPages,
      normalizedSiblingCount,
      normalizedBoundaryCount,
    );
    const classes = ["max-w-full", className].filter(Boolean).join(" ");

    if (!isControlled && uncontrolledPage !== normalizedUncontrolledPage) {
      setUncontrolledPage(normalizedUncontrolledPage);
    }

    function requestPageChange(nextPage: number): void {
      if (disabled) return;

      const normalizedNextPage = normalizePage(
        nextPage,
        normalizedTotalPages,
      );
      if (normalizedNextPage === resolvedPage) return;

      if (!isControlled) {
        setUncontrolledPage(normalizedNextPage);
      }
      onPageChange?.(normalizedNextPage);
    }

    const atFirstPage = resolvedPage === 1;
    const atLastPage = resolvedPage === normalizedTotalPages;

    return (
      <nav
        ref={ref}
        {...props}
        aria-label={nativeAriaLabel ?? ariaLabel}
        className={classes}
      >
        <ul className="flex max-w-full items-center gap-[var(--pagination-gap)] overflow-x-auto py-[var(--state-focus-offset)]">
          {showFirstLast ? (
            <li className="shrink-0">
              <IconButton
                icon={<PaginationIcon>«</PaginationIcon>}
                label="Ir para a primeira página"
                size="sm"
                variant="ghost"
                disabled={disabled || atFirstPage}
                onClick={() => requestPageChange(1)}
              />
            </li>
          ) : null}

          {showPreviousNext ? (
            <li className="shrink-0">
              <IconButton
                icon={<PaginationIcon>‹</PaginationIcon>}
                label="Ir para a página anterior"
                size="sm"
                variant="ghost"
                disabled={disabled || atFirstPage}
                onClick={() => requestPageChange(resolvedPage - 1)}
              />
            </li>
          ) : null}

          {tokens.map((token) => (
            <li key={token} className="shrink-0">
              {typeof token === "number" ? (
                <Button
                  variant={token === resolvedPage ? "primary" : "ghost"}
                  size="sm"
                  disabled={disabled}
                  aria-label={`Ir para a página ${token}`}
                  aria-current={token === resolvedPage ? "page" : undefined}
                  className="min-w-[var(--pagination-item-size)] px-[var(--pagination-item-padding-x)]"
                  onClick={() => requestPageChange(token)}
                >
                  {token}
                </Button>
              ) : (
                <PaginationEllipsis
                  position={token === "start-ellipsis" ? "start" : "end"}
                />
              )}
            </li>
          ))}

          {showPreviousNext ? (
            <li className="shrink-0">
              <IconButton
                icon={<PaginationIcon>›</PaginationIcon>}
                label="Ir para a próxima página"
                size="sm"
                variant="ghost"
                disabled={disabled || atLastPage}
                onClick={() => requestPageChange(resolvedPage + 1)}
              />
            </li>
          ) : null}

          {showFirstLast ? (
            <li className="shrink-0">
              <IconButton
                icon={<PaginationIcon>»</PaginationIcon>}
                label="Ir para a última página"
                size="sm"
                variant="ghost"
                disabled={disabled || atLastPage}
                onClick={() => requestPageChange(normalizedTotalPages)}
              />
            </li>
          ) : null}
        </ul>
      </nav>
    );
  },
);

Pagination.displayName = "Pagination";

export default Pagination;
