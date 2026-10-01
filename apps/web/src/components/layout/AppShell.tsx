"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import Navigation from "./Navigation";
import TopBar from "./TopBar";
import type { CurrentPermission } from "@/auth/types";
import { PRODUCT_NAME } from "@/config/product";
import Icon from "@/components/ui/Icon";

type AppShellProps = {
  title: string;
  clinicName: string;
  children: ReactNode;
  actions?: ReactNode;
  userArea?: ReactNode;
  footer?: ReactNode;
  permissions: CurrentPermission[];
};

export default function AppShell({
  title,
  clinicName,
  children,
  actions,
  userArea,
  footer,
  permissions,
}: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => !collapsed);
  };

  return (
    <div className={`min-h-dvh w-full min-w-0 max-w-full overflow-x-clip bg-hp-background text-hp-foreground lg:grid ${sidebarCollapsed ? "lg:grid-cols-[var(--layout-sidebar-collapsed)_minmax(0,1fr)]" : "lg:grid-cols-[var(--layout-sidebar-expanded)_minmax(0,1fr)]"}`}>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-50 -translate-y-20 rounded-[var(--radius-md)] bg-hp-primary px-4 py-3 font-semibold text-white transition-transform focus:translate-y-0"
      >
        Ir para o conteúdo principal
      </a>

      <aside className={`sticky top-0 hidden h-dvh overflow-y-auto border-r border-hp-border bg-hp-surface lg:block ${sidebarCollapsed ? "px-3 py-4" : "p-5"}`}>
        <div className={`mb-6 flex min-w-0 items-start ${sidebarCollapsed ? "justify-center" : "justify-between gap-3"}`}>
          <div className={sidebarCollapsed ? "sr-only" : "min-w-0"}>
          <p className="text-xl font-bold text-hp-foreground">{PRODUCT_NAME}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-hp-subtle">
            Ambiente da clínica
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-hp-primary" title={clinicName}>
            {clinicName}
          </p>
          </div>
          <button type="button" aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"} title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"} onClick={toggleSidebar} className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground focus-visible:outline-2 focus-visible:outline-hp-focus">
            <Icon name={sidebarCollapsed ? "menu" : "chevron"} className={sidebarCollapsed ? "" : "rotate-180"} />
          </button>
        </div>
        <Navigation permissions={permissions} collapsed={sidebarCollapsed} />
      </aside>

      <div className="flex min-h-dvh min-w-0 w-full max-w-full flex-col overflow-x-clip">
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
              <div className="min-w-0">
                <p className="text-xl font-bold text-hp-foreground">{PRODUCT_NAME}</p>
                <p className="mt-1 max-w-48 truncate text-sm font-semibold text-hp-primary" title={clinicName}>
                  {clinicName}
                </p>
              </div>
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
