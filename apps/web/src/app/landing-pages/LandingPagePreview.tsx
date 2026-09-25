import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import type {
  LandingPageAction,
  LandingPageContent,
} from "@/services/landing-page-service";

function PreviewAction({ action }: { action: LandingPageAction }) {
  return (
    <span
      aria-label={`${action.label} (pré-visualização)`}
      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-hp-primary px-4 text-sm font-semibold text-[var(--color-text-inverse)]"
    >
      {action.label}
    </span>
  );
}

export default function LandingPagePreview({ content }: { content: LandingPageContent }) {
  if (content.blocks.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-hp-border-strong bg-hp-surface p-8 text-center text-sm text-hp-muted">
        A pré-visualização aparecerá quando o primeiro bloco for adicionado.
      </div>
    );
  }

  return (
    <div
      aria-label="Pré-visualização da landing page"
      className="overflow-hidden rounded-[var(--radius-lg)] border border-hp-border-strong bg-hp-surface shadow-[var(--shadow-sm)]"
    >
      {content.blocks.map((block) => {
        if (block.type === "HERO") {
          return (
            <section key={block.id} className="bg-hp-primary-soft px-6 py-12 text-center sm:px-10">
              {block.eyebrow ? (
                <p className="text-sm font-semibold uppercase tracking-wide text-hp-primary">
                  {block.eyebrow}
                </p>
              ) : null}
              <h3 className="mx-auto mt-2 max-w-3xl text-3xl font-semibold leading-tight text-hp-foreground sm:text-4xl">
                {block.heading || "Título do destaque"}
              </h3>
              {block.body ? (
                <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-hp-muted">{block.body}</p>
              ) : null}
              {block.primary_action ? (
                <div className="mt-6"><PreviewAction action={block.primary_action} /></div>
              ) : null}
            </section>
          );
        }

        if (block.type === "TEXT") {
          return (
            <section key={block.id} className="px-6 py-10 sm:px-10">
              <div className="mx-auto max-w-3xl">
                {block.heading ? <h3 className="text-2xl font-semibold text-hp-foreground">{block.heading}</h3> : null}
                <p className={`${block.heading ? "mt-4" : ""} whitespace-pre-line leading-relaxed text-hp-muted`}>
                  {block.body || "Conteúdo do bloco"}
                </p>
              </div>
            </section>
          );
        }

        if (block.type === "FEATURES") {
          return (
            <section key={block.id} className="bg-hp-surface-subtle px-6 py-10 sm:px-10">
              {block.heading ? <h3 className="text-center text-2xl font-semibold text-hp-foreground">{block.heading}</h3> : null}
              <div className={`mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3 ${block.heading ? "mt-6" : ""}`}>
                {block.items.map((item, index) => (
                  <Card key={`${block.id}-feature-${index}`} variant="default" padding="sm">
                    <h4 className="font-semibold text-hp-foreground">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-hp-muted">{item.body}</p>
                  </Card>
                ))}
              </div>
            </section>
          );
        }

        if (block.type === "CALL_TO_ACTION") {
          return (
            <section key={block.id} className="bg-hp-primary px-6 py-10 text-center sm:px-10">
              <h3 className="text-2xl font-semibold text-[var(--color-text-inverse)]">{block.heading}</h3>
              {block.body ? <p className="mx-auto mt-3 max-w-2xl text-[var(--color-text-inverse)] opacity-90">{block.body}</p> : null}
              <div className="mt-6 [&>span]:bg-hp-surface [&>span]:text-hp-primary">
                <PreviewAction action={block.action} />
              </div>
            </section>
          );
        }

        if (block.type === "FAQ") {
          return (
            <section key={block.id} className="px-6 py-10 sm:px-10">
              <div className="mx-auto max-w-3xl">
                {block.heading ? <h3 className="text-2xl font-semibold text-hp-foreground">{block.heading}</h3> : null}
                <dl className={`${block.heading ? "mt-6" : ""} divide-y divide-hp-border`}>
                  {block.items.map((item, index) => (
                    <div key={`${block.id}-faq-${index}`} className="py-4">
                      <dt className="font-semibold text-hp-foreground">{item.question}</dt>
                      <dd className="mt-2 whitespace-pre-line text-sm leading-relaxed text-hp-muted">{item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          );
        }

        return (
          <section key={block.id} className="bg-hp-surface-subtle px-6 py-10 sm:px-10">
            <div className="mx-auto max-w-xl">
              <h3 className="text-center text-2xl font-semibold text-hp-foreground">{block.heading}</h3>
              {block.body ? <p className="mt-3 text-center text-hp-muted">{block.body}</p> : null}
              <div className="mt-6 space-y-4 rounded-[var(--radius-lg)] bg-hp-surface p-5 shadow-[var(--shadow-xs)]">
                <Input label="Nome" disabled placeholder="Seu nome" />
                <Input label="E-mail" type="email" disabled placeholder="voce@exemplo.com" />
                <Button className="w-full" disabled>{block.submit_label}</Button>
                <p className="text-center text-xs text-hp-muted">
                  Formulário desabilitado na pré-visualização.
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
