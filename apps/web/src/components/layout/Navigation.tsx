"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { CurrentPermission, PermissionModule } from "@/auth/types";
import Badge from "@/components/ui/Badge";

const primaryItems = [
  { label: "Início", href: "/inicio", module: null },
  { label: "Dashboard", href: "/dashboard", module: "DASHBOARD" },
] as const satisfies ReadonlyArray<{
  label: string;
  href: string;
  module: PermissionModule | null;
}>;

const navigationGroups = [
  {
    id: "commercial",
    label: "Centro Comercial",
    items: [
      { label: "CRM", href: "/crm", module: "CRM" },
      { label: "Landing Pages", planned: true },
      { label: "Sites", planned: true },
    ],
  },
  {
    id: "clinical",
    label: "Centro Clínico",
    items: [
      { label: "Pacientes", href: "/pacientes", module: "PATIENTS" },
      {
        label: "Profissionais",
        href: "/profissionais",
        module: "PROFESSIONALS",
      },
      { label: "Serviços", href: "/servicos", module: "SERVICES" },
      { label: "Agenda", href: "/agenda", module: "APPOINTMENTS" },
    ],
  },
  {
    id: "financial",
    label: "Centro Financeiro",
    items: [{ label: "Financeiro", planned: true }],
  },
  {
    id: "administrative",
    label: "Centro Administrativo",
    items: [
      {
        label: "Configurações",
        href: "/configuracoes",
        module: "COMPANY",
      },
    ],
  },
  {
    id: "intelligence",
    label: "Centro de Inteligência",
    items: [
      { label: "IA", planned: true },
      { label: "Relatórios", planned: true },
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  items: ReadonlyArray<
    | {
        label: string;
        href: string;
        module: PermissionModule;
      }
    | {
        label: string;
        planned: true;
      }
  >;
}>;

type NavigationProps = {
  id?: string;
  onNavigate?: () => void;
  permissions: CurrentPermission[];
};

const linkClasses =
  "flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none";

export default function Navigation({
  id,
  onNavigate,
  permissions,
}: NavigationProps) {
  const pathname = usePathname();
  const canView = (module: PermissionModule) =>
    permissions.some(
      (permission) =>
        permission.module === module && permission.actions.includes("VIEW"),
    );
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const visiblePrimaryItems = primaryItems.filter(
    (item) => item.module === null || canView(item.module),
  );

  return (
    <nav id={id} aria-label="Navegação principal" className="space-y-6">
      <ul className="space-y-1">
        {visiblePrimaryItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={onNavigate}
              className={`${linkClasses} ${
                isActive(item.href)
                  ? "bg-hp-primary-soft text-hp-primary"
                  : "text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {navigationGroups.map((group) => {
        const visibleItems = group.items.filter(
          (item) => "planned" in item || canView(item.module),
        );

        if (visibleItems.length === 0) {
          return null;
        }

        return (
          <section key={group.id} aria-labelledby={`nav-${group.id}`}>
            <h2
              id={`nav-${group.id}`}
              className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-hp-subtle"
            >
              {group.label}
            </h2>

            <ul className="space-y-1">
              {visibleItems.map((item) => {
                if ("planned" in item) {
                  return (
                    <li key={item.label}>
                      <span
                        aria-disabled="true"
                        className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium text-hp-subtle"
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                        <Badge variant="neutral" size="sm">
                          Em breve
                        </Badge>
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      onClick={onNavigate}
                      className={`${linkClasses} ${
                        isActive(item.href)
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
        );
      })}
    </nav>
  );
}
