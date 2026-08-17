"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import Navigation from "./Navigation";
import TopBar from "./TopBar";
import type { CurrentPermission } from "@/auth/types";

type AppShellProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  userArea?: ReactNode;
  footer?: ReactNode;
  permissions: CurrentPermission[];
};

export default function AppShell({
  title,
  children,
  actions,
  userArea,
  footer,
  permissions,
}: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeNavigation = useCallback((restoreFocus = true) => {
    setNavigationOpen(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        document.getElementById("app-navigation-trigger")?.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (!navigationOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNavigation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeNavigation, navigationOpen]);

  return (
    <div className="min-h-dvh w-full min-w-0 max-w-full overflow-x-hidden bg-hp-background text-hp-foreground lg:grid lg:grid-cols-[var(--layout-sidebar-expanded)_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-[var(--radius-md)] bg-hp-primary px-4 py-3 font-semibold text-white transition-transform focus:translate-y-0"
      >
        Ir para o conteúdo principal
      </a>

      <aside className="sticky top-0 hidden h-dvh border-r border-hp-border bg-hp-surface p-6 lg:block">
        <div className="mb-8 text-xl font-bold text-hp-foreground">HPTECH</div>
        <Navigation permissions={permissions} />
      </aside>

      <div className="flex min-h-dvh min-w-0 w-full max-w-full flex-col overflow-x-hidden">
        <TopBar
          title={title}
          navigationOpen={navigationOpen}
          onNavigationOpen={() => setNavigationOpen(true)}
          actions={actions}
          userArea={userArea}
        />

        <main
          id="main-content"
          className="mx-auto w-full min-w-0 max-w-[var(--layout-content-max)] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>

        {footer}
      </div>

      {navigationOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={() => closeNavigation()}
            className="absolute inset-0 bg-[var(--color-overlay)]"
          />

          <aside
            id="app-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            className="relative h-dvh w-[min(var(--layout-sidebar-expanded),calc(100vw-3rem))] overflow-y-auto border-r border-hp-border bg-hp-surface p-6 shadow-[var(--shadow-lg)]"
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="text-xl font-bold text-hp-foreground">HPTECH</div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Fechar navegação"
                onClick={() => closeNavigation()}
                className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] text-2xl text-hp-foreground transition-colors duration-[var(--duration-fast)] hover:bg-hp-surface-subtle"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <Navigation
              permissions={permissions}
              onNavigate={() => closeNavigation(false)}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
