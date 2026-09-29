import { requireCurrentUser } from "@/auth/session";
import SessionUser from "@/auth/SessionUser";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";

import ChangePasswordForm from "./ChangePasswordForm";

export default async function MyAccountPage() {
  const user = await requireCurrentUser();
  return (
    <AppShell title="Minha conta" clinicName={user.company.name} permissions={user.permissions} userArea={<SessionUser user={user} />}>
      <div className="space-y-8">
        <PageHeader title="Minha conta" description="Gerencie as configurações pessoais da sua conta." />
        <Section title="Segurança" description="Altere sua senha e encerre as sessões emitidas anteriormente.">
          <ChangePasswordForm />
        </Section>
      </div>
    </AppShell>
  );
}
