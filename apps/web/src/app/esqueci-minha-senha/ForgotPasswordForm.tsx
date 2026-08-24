"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const GENERIC = "Se existir uma conta para esse email, você receberá instruções para redefinir sua senha.";

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    setMessage(response?.status === 429 ? "Muitas solicitações. Tente novamente mais tarde." : GENERIC);
    setLoading(false);
  }
  return <form className="mt-6 space-y-4" onSubmit={submit}>{message ? <Alert variant="info" description={message} live="polite" /> : null}<Input label="Email" name="email" type="email" autoComplete="email" required /><Button className="w-full" type="submit" loading={loading}>Enviar instruções</Button><Link className="block text-center text-sm text-hp-primary" href="/login">Voltar ao login</Link></form>;
}
