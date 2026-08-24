"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ChangePasswordForm() {
  const router = useRouter(); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const currentPassword = String(data.get("currentPassword") ?? ""); const newPassword = String(data.get("newPassword") ?? ""); const confirmation = String(data.get("confirmation") ?? "");
    if (newPassword !== confirmation) return setError("As senhas não coincidem.");
    setLoading(true); setError(null);
    const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }).catch(() => null);
    if (!response?.ok) { const body = await response?.json().catch(() => null) as { detail?: string; error?: string } | null; setError(body?.detail ?? body?.error ?? "Não foi possível alterar a senha."); setLoading(false); return; }
    router.replace("/login?password=changed"); router.refresh();
  }
  return <form className="max-w-lg space-y-4" onSubmit={submit}>{error ? <Alert variant="danger" description={error} live="assertive" /> : null}<Input label="Senha atual" name="currentPassword" type="password" autoComplete="current-password" required /><Input label="Nova senha" name="newPassword" type="password" autoComplete="new-password" required /><Input label="Confirmar nova senha" name="confirmation" type="password" autoComplete="new-password" required /><Button type="submit" loading={loading}>Alterar senha</Button></form>;
}
