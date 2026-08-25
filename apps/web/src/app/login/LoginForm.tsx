"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Não foi possível entrar agora. Tente novamente.";
        setError(message);
        setSubmitting(false);
        return;
      }

      router.replace("/inicio");
      router.refresh();
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error && <Alert variant="danger" description={error} live="assertive" />}
      <Input label="Email" name="email" type="email" autoComplete="email" required disabled={submitting} />
      <Input label="Senha" name="password" type="password" autoComplete="current-password" required disabled={submitting} />
      <Button className="w-full" type="submit" loading={submitting}>
        Entrar
      </Button>
      <Link className="block text-center text-sm text-hp-primary" href="/esqueci-minha-senha">
        Esqueci minha senha
      </Link>
    </form>
  );
}
