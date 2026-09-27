import Card from "@/components/ui/Card";
import type {
  LandingPageAction,
  LandingPageBlock,
  PublicLandingPageData,
} from "@/services/landing-page-service";

import PublicContactForm from "./PublicContactForm";

function PublicAction({ action, inverted = false }: { action: LandingPageAction; inverted?: boolean }) {
  return (
    <a
      href={action.href}
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hp-focus ${
        inverted
          ? "bg-hp-surface text-hp-primary hover:bg-hp-surface-subtle"
          : "bg-hp-primary text-[var(--color-text-inverse)] hover:bg-hp-primary-hover"
      }`}
    >
      {action.label}
    </a>
  );
}

function blockHeading(block: LandingPageBlock): string | null {
  if ("heading" in block) return block.heading;
  return null;
}

export default function PublicLandingPageRenderer({
  page,
}: {
  page: PublicLandingPageData;
}) {
  const firstHeadingId = page.content.blocks.find((block) => blockHeading(block))?.id;

  function Heading({
    block,
    className,
  }: {
    block: LandingPageBlock;
    className: string;
  }) {
    const Tag = block.id === firstHeadingId ? "h1" : "h2";
    return <Tag className={className}>{blockHeading(block)}</Tag>;
  }

  return (
    <div className="min-h-screen bg-hp-background text-hp-foreground">
      <header className="border-b border-hp-border bg-hp-surface px-5 py-4 sm:px-8">
        <p className="mx-auto max-w-6xl text-sm font-semibold text-hp-foreground">
          {page.company.name}
        </p>
      </header>
      <main>
        {firstHeadingId ? null : <h1 className="sr-only">{page.name}</h1>}
        {page.content.blocks.map((block) => {
          if (block.type === "HERO") {
            return (
              <section key={block.id} className="bg-hp-primary-soft px-5 py-16 text-center sm:px-8 sm:py-24">
                {block.eyebrow ? (
                  <p className="text-sm font-semibold uppercase tracking-wide text-hp-primary">{block.eyebrow}</p>
                ) : null}
                <Heading block={block} className="mx-auto mt-2 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl" />
                {block.body ? <p className="mx-auto mt-5 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-hp-muted">{block.body}</p> : null}
                {block.primary_action ? <div className="mt-8"><PublicAction action={block.primary_action} /></div> : null}
              </section>
            );
          }

          if (block.type === "TEXT") {
            return (
              <section key={block.id} className="px-5 py-12 sm:px-8 sm:py-16">
                <div className="mx-auto max-w-3xl">
                  {block.heading ? <Heading block={block} className="text-3xl font-semibold" /> : null}
                  <p className={`${block.heading ? "mt-5" : ""} whitespace-pre-line text-base leading-relaxed text-hp-muted`}>{block.body}</p>
                </div>
              </section>
            );
          }

          if (block.type === "FEATURES") {
            return (
              <section key={block.id} className="bg-hp-surface-subtle px-5 py-12 sm:px-8 sm:py-16">
                {block.heading ? <Heading block={block} className="text-center text-3xl font-semibold" /> : null}
                <div className={`mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 ${block.heading ? "mt-8" : ""}`}>
                  {block.items.map((item, index) => (
                    <Card key={`${block.id}-feature-${index}`} padding="md">
                      {block.heading ? (
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                      ) : (
                        <h2 className="text-lg font-semibold">{item.title}</h2>
                      )}
                      <p className="mt-2 leading-relaxed text-hp-muted">{item.body}</p>
                    </Card>
                  ))}
                </div>
              </section>
            );
          }

          if (block.type === "CALL_TO_ACTION") {
            return (
              <section key={block.id} className="bg-hp-primary px-5 py-12 text-center sm:px-8 sm:py-16">
                <Heading block={block} className="text-3xl font-semibold text-[var(--color-text-inverse)]" />
                {block.body ? <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-inverse)] opacity-90">{block.body}</p> : null}
                <div className="mt-7"><PublicAction action={block.action} inverted /></div>
              </section>
            );
          }

          if (block.type === "FAQ") {
            return (
              <section key={block.id} className="px-5 py-12 sm:px-8 sm:py-16">
                <div className="mx-auto max-w-3xl">
                  {block.heading ? <Heading block={block} className="text-3xl font-semibold" /> : null}
                  <dl className={`${block.heading ? "mt-7" : ""} divide-y divide-hp-border`}>
                    {block.items.map((item, index) => (
                      <div key={`${block.id}-faq-${index}`} className="py-5">
                        <dt className="font-semibold">{item.question}</dt>
                        <dd className="mt-2 whitespace-pre-line leading-relaxed text-hp-muted">{item.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            );
          }

          return (
            <section key={block.id} className="bg-hp-surface-subtle px-5 py-12 sm:px-8 sm:py-16">
              <div className="mx-auto max-w-xl">
                <Heading block={block} className="text-center text-3xl font-semibold" />
                {block.body ? <p className="mt-4 text-center leading-relaxed text-hp-muted">{block.body}</p> : null}
                <div className="mt-7 rounded-[var(--radius-lg)] bg-hp-surface p-5 shadow-[var(--shadow-sm)] sm:p-7">
                  <PublicContactForm
                    companySlug={page.company.slug}
                    landingPageSlug={page.slug}
                    submitLabel={block.submit_label}
                    successMessage={block.success_message}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </main>
      <footer className="border-t border-hp-border bg-hp-surface px-5 py-6 text-center text-sm text-hp-muted">
        {page.company.name}
      </footer>
    </div>
  );
}
