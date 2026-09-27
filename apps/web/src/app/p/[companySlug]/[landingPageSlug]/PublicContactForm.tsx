"use client";

import { useId, useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import {
  LandingPageApiError,
  submitPublicLandingPage,
} from "@/services/landing-page-service";

type PublicContactFormProps = {
  companySlug: string;
  landingPageSlug: string;
  submitLabel: string;
  successMessage: string;
};

export default function PublicContactForm({
  companySlug,
  landingPageSlug,
  submitLabel,
  successMessage,
}: PublicContactFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const honeypotId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!email && !phone) {
      setError("Informe um e-mail ou telefone para contato.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitPublicLandingPage(companySlug, landingPageSlug, {
        name: String(formData.get("name") ?? ""),
        email: email || undefined,
        phone: phone || undefined,
        privacy_consent: true,
        website: String(formData.get("website") ?? "") || undefined,
      });
      form.reset();
      setSubmitted(true);
    } catch (caught) {
      if (caught instanceof LandingPageApiError && caught.status === 429) {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        setError("Não foi possível enviar seus dados agora. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-md)] border border-hp-success bg-[var(--color-success-soft)] p-4 text-sm text-hp-foreground"
      >
        {successMessage}
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate={false}>
      <Input label="Nome" name="name" autoComplete="name" required maxLength={150} />
      <Input
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={150}
      />
      <Input
        label="Telefone"
        name="phone"
        type="tel"
        autoComplete="tel"
        maxLength={30}
      />
      <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">
        <label htmlFor={honeypotId}>Não preencha este campo</label>
        <input
          id={honeypotId}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <Checkbox
        name="privacy_consent"
        required
        label="Autorizo o uso destes dados para receber contato sobre esta solicitação."
      />
      {error ? (
        <p role="alert" className="text-sm text-hp-danger">
          {error}
        </p>
      ) : null}
      <Button className="w-full" type="submit" loading={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
