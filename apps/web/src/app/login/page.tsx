import Card from "@/components/ui/Card";

import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-hp-background px-4 py-8 text-hp-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xl font-bold text-hp-primary">HPTECH</p>
          <h1 className="mt-3 text-2xl font-bold">Acesse sua conta</h1>
          <p className="mt-2 text-sm text-hp-muted">Entre para continuar na plataforma.</p>
        </div>
        <Card variant="elevated" padding="lg">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
