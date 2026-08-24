import Card from "@/components/ui/Card";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <main className="flex min-h-dvh items-center justify-center bg-hp-background px-4 py-8"><Card className="w-full max-w-md" variant="elevated" padding="lg"><h1 className="text-2xl font-bold">Esqueci minha senha</h1><p className="mt-2 text-sm text-hp-muted">Informe seu email para receber instruções.</p><ForgotPasswordForm /></Card></main>;
}
