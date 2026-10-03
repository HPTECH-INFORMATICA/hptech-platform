"use client";

import type { ReactNode } from "react";

import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

export type RowActionsMenuProps = {
  label: string;
  children: ReactNode;
  disabled?: boolean;
};

export default function RowActionsMenu({
  label,
  children,
  disabled = false,
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        disabled={disabled}
        className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-xl font-bold text-hp-muted transition-colors hover:bg-hp-surface-subtle hover:text-hp-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus disabled:pointer-events-none disabled:opacity-50"
      >
        <span aria-hidden="true">⋯</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
