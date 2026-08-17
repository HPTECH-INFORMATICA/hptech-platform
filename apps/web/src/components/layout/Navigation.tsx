"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { CurrentPermission } from "@/auth/types";

const dashboardItem = { label: "Dashboard", href: "/dashboard" } as const;

const navigationGroups = [
  {
    id: "commercial",
    label: "Centro Comercial",
    items: [
      { label: "CRM", href: "/crm" },
      { label: "Landing Pages", href: "/landing-pages" },
    ],
  },
  {
    id: "clinical",
    label: "Centro Clínico",
    items: [{ label: "Agenda", href: "/agenda" }],
  },
  {
    id: "financial",
    label: "Centro Financeiro",
    items: [{ label: "Financeiro", href: "/financeiro" }],
  },
  {
    id: "administrative",
    label: "Centro Administrativo",
    items: [{ label: "Configurações", href: "/configuracoes" }],
  },
  {
    id: "intelligence",
    label: "Centro de Inteligência",
    items: [
      { label: "IA", href: "/ia" },
      { label: "Relatórios", href: "/relatorios" },
    ],
  },
] as const;

type NavigationProps = {
  id?: string;
  onNavigate?: () => void;
  permissions: CurrentPermission[];
};

export default function Navigation({
  id,
  onNavigate,
  permissions,
}: NavigationProps) {
  const pathname = usePathname();
  const canView = (module: "DASHBOARD" | "CRM") =>
    permissions.some(
      (permission) =>
        permission.module === module && permission.actions.includes("VIEW"),
    );
  const isDashboardActive =
    pathname === dashboardItem.href ||
    pathname.startsWith(`${dashboardItem.href}/`);

  return (
    <nav id={id} aria-label="Navegação principal" className="space-y-6">
      {canView("DASHBOARD") && <ul>
        <li>
          <Link
            href={dashboardItem.href}
            aria-current={isDashboardActive ? "page" : undefined}
            onClick={onNavigate}
            className={`flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none ${
              isDashboardActive
                ? "bg-hp-primary-soft text-hp-primary"
                : "text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground"
            }`}
          >
            {dashboardItem.label}
          </Link>
        </li>
      </ul>}

      {navigationGroups.map((group) => (
        <section key={group.id} aria-labelledby={`nav-${group.id}`}>
          <h2
            id={`nav-${group.id}`}
            className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-hp-subtle"
          >
            {group.label}
          </h2>

          <ul className="space-y-1">
            {group.items.map((item) => {
              if (item.href === "/crm" && !canView("CRM")) {
                return null;
              }
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                    className={`flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none ${
                      isActive
                        ? "bg-hp-primary-soft text-hp-primary"
                        : "text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
