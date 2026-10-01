"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { CurrentPermission, PermissionModule } from "@/auth/types";
import Badge from "@/components/ui/Badge";
import Icon, { type IconName } from "@/components/ui/Icon";

type NavigationItem =
  | { label: string; href: string; module: PermissionModule | null; icon: IconName }
  | { label: string; planned: true; icon: IconName };

const navigationGroups: ReadonlyArray<{ id: string; label: string; icon: IconName; items: ReadonlyArray<NavigationItem> }> = [
  { id: "overview", label: "Visão geral", icon: "dashboard", items: [
    { label: "Início", href: "/inicio", module: null, icon: "home" },
    { label: "Dashboard", href: "/dashboard", module: "DASHBOARD", icon: "dashboard" },
  ] },
  { id: "commercial", label: "Comercial", icon: "commercial", items: [
    { label: "CRM", href: "/crm", module: "CRM", icon: "crm" },
    { label: "Landing Pages", href: "/landing-pages", module: "LANDING_PAGES", icon: "landing" },
    { label: "Sites", planned: true, icon: "sites" },
  ] },
  { id: "clinical", label: "Clínico", icon: "clinic", items: [
    { label: "Pacientes", href: "/pacientes", module: "PATIENTS", icon: "patients" },
    { label: "Profissionais", href: "/profissionais", module: "PROFESSIONALS", icon: "professionals" },
    { label: "Serviços", href: "/servicos", module: "SERVICES", icon: "services" },
    { label: "Agenda", href: "/agenda", module: "APPOINTMENTS", icon: "agenda" },
  ] },
  { id: "financial", label: "Financeiro", icon: "finance", items: [
    { label: "Gestão financeira", href: "/financeiro", module: "FINANCIAL", icon: "finance" },
  ] },
  { id: "administrative", label: "Administrativo", icon: "settings", items: [
    { label: "Configurações", href: "/configuracoes", module: "COMPANY", icon: "settings" },
  ] },
  { id: "intelligence", label: "Inteligência", icon: "intelligence", items: [
    { label: "IA", planned: true, icon: "intelligence" },
    { label: "Relatórios", planned: true, icon: "reports" },
  ] },
];

type NavigationProps = { id?: string; onNavigate?: () => void; permissions: CurrentPermission[]; collapsed?: boolean };

export default function Navigation({ id, onNavigate, permissions, collapsed = false }: NavigationProps) {
  const pathname = usePathname();
  const activeGroup = navigationGroups.find((group) =>
    group.items.some((item) => "href" in item && (pathname === item.href || pathname.startsWith(`${item.href}/`))),
  )?.id;
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["overview", activeGroup].filter((value): value is string => Boolean(value))),
  );

  const canView = (module: PermissionModule) => permissions.some(
    (permission) => permission.module === module && permission.actions.includes("VIEW"),
  );
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (collapsed) return (
    <nav id={id} aria-label="Navegação principal" className="space-y-1">
      {navigationGroups.flatMap((group) => group.items).map((item) => {
        if (!("href" in item) || (item.module !== null && !canView(item.module))) return null;
        return <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={isActive(item.href) ? "page" : undefined} onClick={onNavigate} className={`flex size-11 items-center justify-center rounded-[var(--radius-md)] transition-colors focus-visible:outline-2 focus-visible:outline-hp-focus ${isActive(item.href) ? "bg-hp-primary-soft text-hp-primary" : "text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground"}`}><Icon name={item.icon} /></Link>;
      })}
    </nav>
  );

  return (
    <nav id={id} aria-label="Navegação principal" className="space-y-2">
      {navigationGroups.map((group) => {
        const visibleItems = group.items.filter((item) => "planned" in item || item.module === null || canView(item.module));
        if (visibleItems.length === 0) return null;
        const open = openGroups.has(group.id);
        const groupActive = group.id === activeGroup;
        return (
          <section key={group.id}>
            <button type="button" aria-expanded={open} aria-controls={`nav-${group.id}`} onClick={() => setOpenGroups((current) => {
              const next = new Set(current);
              if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
              return next;
            })} className={`flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-hp-focus ${groupActive ? "text-hp-primary" : "text-hp-foreground hover:bg-hp-surface-subtle"}`}>
              <Icon name={group.icon} /><span className="min-w-0 flex-1 truncate">{group.label}</span><Icon name="chevron" className={`size-4 transition-transform ${open ? "rotate-90" : ""}`} />
            </button>
            {open ? <ul id={`nav-${group.id}`} className="ml-[1.35rem] mt-1 space-y-1 border-l border-hp-border pl-3">
              {visibleItems.map((item) => {
                if ("planned" in item) return <li key={item.label} className="flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm text-hp-subtle"><Icon name={item.icon} className="size-4" /><span className="min-w-0 flex-1 truncate">{item.label}</span><Badge variant="neutral" size="sm">Em breve</Badge></li>;
                return <li key={item.href}><Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={onNavigate} className={`flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-hp-focus ${isActive(item.href) ? "bg-hp-primary-soft text-hp-primary" : "text-hp-muted hover:bg-hp-surface-subtle hover:text-hp-foreground"}`}><Icon name={item.icon} className="size-4" /><span className="truncate">{item.label}</span></Link></li>;
              })}
            </ul> : null}
          </section>
        );
      })}
    </nav>
  );
}
