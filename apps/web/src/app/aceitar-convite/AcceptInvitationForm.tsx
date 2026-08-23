"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AcceptInvitationForm() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const capturedToken = fragment.get("token");

    if (capturedToken && tokenRef.current === null) {
      tokenRef.current = capturedToken;
    }

    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    if (!tokenRef.current) return setError("Convite inválido ou ausente.");
    if (password !== confirmation) return setError("As senhas não coincidem.");
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/auth/accept-invitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: tokenRef.current, password }),
    }).catch(() => null);
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { detail?: string; error?: string } | null;
      setError(body?.detail ?? body?.error ?? "Não foi possível aceitar o convite.");
      setSubmitting(false);
      return;
    }
    tokenRef.current = null;
    router.replace("/login");
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      {error ? <Alert variant="danger" description={error} live="assertive" /> : null}
      <Input label="Nova senha" name="password" type="password" autoComplete="new-password" required />
      <Input label="Confirmar nova senha" name="confirmation" type="password" autoComplete="new-password" required />
      <Button className="w-full" type="submit" loading={submitting}>Criar acesso</Button>
    </form>
  );
}
