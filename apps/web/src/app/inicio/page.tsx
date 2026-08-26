import Link from "next/link";

import { requireCurrentUser } from "@/auth/session";
import { hasPermission } from "@/auth/types";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";

export default async function StartPage() {
  const user = await requireCurrentUser();
  const availableModules = [
    hasPermission(user, "DASHBOARD", "VIEW")
      ? { label: "Dashboard", href: "/dashboard" }
      : null,
    hasPermission(user, "CRM", "VIEW")
      ? { label: "CRM", href: "/crm" }
      : null,
    hasPermission(user, "SERVICES", "VIEW")
      ? { label: "Serviços", href: "/servicos" }
      : null,
    hasPermission(user, "PATIENTS", "VIEW")
      ? { label: "Pacientes", href: "/pacientes" }
      : null,
    hasPermission(user, "COMPANY", "VIEW")
      ? { label: "Configurações", href: "/configuracoes" }
      : null,
  ].filter((module): module is { label: string; href: string } => module !== null);

  return (
    <AppShell
      title="Início"
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <div className="space-y-8">
        <PageHeader
          title="HPTECH Platform"
          description={`Bem-vindo, ${user.name}. Selecione no menu uma área disponível para continuar.`}
        />

        {availableModules.length > 0 ? (
          <section aria-labelledby="available-modules-title" className="space-y-4">
            <h2
              id="available-modules-title"
              className="text-lg font-semibold text-hp-foreground"
            >
              Áreas disponíveis
            </h2>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableModules.map((module) => (
                <Card key={module.href} padding="sm" variant="outlined">
                  <Link
                    href={module.href}
                    className="flex min-h-11 items-center font-semibold text-hp-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus"
                  >
                    {module.label}
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        ) : (
          <Card variant="subtle">
            <p className="text-sm text-hp-muted">
              Você ainda não possui acesso a módulos da plataforma.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
