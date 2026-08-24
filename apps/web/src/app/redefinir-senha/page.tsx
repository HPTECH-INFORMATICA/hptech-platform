import Card from "@/components/ui/Card";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { referrer: "no-referrer" };
export default function ResetPasswordPage() {
  return <main className="flex min-h-dvh items-center justify-center bg-hp-background px-4 py-8"><Card className="w-full max-w-md" variant="elevated" padding="lg"><h1 className="text-2xl font-bold">Redefinir senha</h1><p className="mt-2 text-sm text-hp-muted">Crie uma nova senha para sua conta.</p><ResetPasswordForm /></Card></main>;
}
