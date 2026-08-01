"use client";

import type { ReactNode } from "react";

type TopBarProps = {
  title: string;
  navigationOpen: boolean;
  onNavigationOpen: () => void;
  actions?: ReactNode;
  userArea?: ReactNode;
};

export default function TopBar({
  title,
  navigationOpen,
  onNavigationOpen,
  actions,
  userArea,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[var(--layout-header-height)] w-full min-w-0 max-w-full items-center gap-4 border-b border-hp-border bg-hp-surface px-4 shadow-[var(--shadow-xs)] sm:px-6 lg:px-8">
      <button
        id="app-navigation-trigger"
        type="button"
        aria-label="Abrir navegação"
        aria-controls="app-navigation-drawer"
        aria-expanded={navigationOpen}
        onClick={onNavigationOpen}
        className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] text-2xl text-hp-foreground transition-colors duration-[var(--duration-fast)] hover:bg-hp-surface-subtle lg:hidden"
      >
        <span aria-hidden="true">≡</span>
      </button>

      <p className="min-w-0 flex-1 truncate text-base font-semibold text-hp-foreground">
        {title}
      </p>

      {actions && (
        <div className="hidden min-w-0 max-w-[50%] items-center gap-2 overflow-hidden sm:flex">
          {actions}
        </div>
      )}

      <div className="flex shrink-0 items-center">
        {userArea ?? (
          <div
            aria-label="Área do usuário"
            className="flex size-10 items-center justify-center rounded-full bg-hp-primary-soft text-sm font-semibold text-hp-primary"
          >
            HP
          </div>
        )}
      </div>
    </header>
  );
}
