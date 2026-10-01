import Link from "next/link";

import { requireCurrentUser } from "@/auth/session";
import { hasPermission } from "@/auth/types";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";
import Card from "@/components/ui/Card";
import Icon, { type IconName } from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";

export default async function StartPage() {
  const user = await requireCurrentUser();
  const availableModules = [
    hasPermission(user, "DASHBOARD", "VIEW")
      ? { label: "Dashboard", href: "/dashboard", icon: "dashboard", description: "Indicadores operacionais, comerciais e financeiros." }
      : null,
    hasPermission(user, "CRM", "VIEW")
      ? { label: "CRM", href: "/crm", icon: "crm", description: "Leads, oportunidades e relacionamento comercial." }
      : null,
    hasPermission(user, "SERVICES", "VIEW")
      ? { label: "Serviços", href: "/servicos", icon: "services", description: "Catálogo, categorias, preços e duração." }
      : null,
    hasPermission(user, "PATIENTS", "VIEW")
      ? { label: "Pacientes", href: "/pacientes", icon: "patients", description: "Cadastros, histórico e jornada clínica." }
      : null,
    hasPermission(user, "COMPANY", "VIEW")
      ? { label: "Configurações", href: "/configuracoes", icon: "settings", description: "Empresa, acessos e parâmetros da clínica." }
      : null,
  ].filter((module): module is { label: string; href: string; icon: IconName; description: string } => module !== null);

  return (
    <AppShell
      title="Início"
      clinicName={user.company.name}
      permissions={user.permissions}
      userArea={<SessionUser user={user} />}
    >
      <div className="space-y-8">
        <PageHeader
          title={user.company.name}
          description={`Bem-vindo, ${user.name}. Você está no HPTECH Clinic, ambiente de gestão da sua clínica.`}
          metadata="Selecione uma área disponível para continuar."
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
                <Card key={module.href} padding="none" variant="outlined" interactive>
                  <Link href={module.href} className="group flex h-full min-h-32 items-start gap-4 rounded-[var(--radius-lg)] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-hp-primary-soft text-hp-primary"><Icon name={module.icon} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3 font-semibold text-hp-foreground"><span>{module.label}</span><Icon name="chevron" className="size-4 text-hp-subtle transition-transform group-hover:translate-x-1" /></span>
                      <span className="mt-2 block text-sm leading-6 text-hp-muted">{module.description}</span>
                    </span>
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
