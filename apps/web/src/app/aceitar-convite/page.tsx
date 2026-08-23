import Card from "@/components/ui/Card";

import AcceptInvitationForm from "./AcceptInvitationForm";

export const metadata = { referrer: "no-referrer" };

export default function AcceptInvitationPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-hp-background px-4 py-8">
      <Card className="w-full max-w-md" variant="elevated" padding="lg">
        <h1 className="text-2xl font-bold">Aceitar convite</h1>
        <p className="mt-2 text-sm text-hp-muted">Defina sua senha para acessar a HPTECH Platform.</p>
        <AcceptInvitationForm />
      </Card>
    </main>
  );
}
