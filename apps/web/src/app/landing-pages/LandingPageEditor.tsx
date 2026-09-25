import type { ChangeEvent } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import type {
  LandingPageBlock,
  LandingPageContent,
  LandingPageSeo,
  LandingPageTemplate,
} from "@/services/landing-page-service";

export type LandingPageDraft = {
  name: string;
  slug: string;
  template: LandingPageTemplate;
  content: LandingPageContent;
  seo: LandingPageSeo;
};

type BlockType = LandingPageBlock["type"];

const blockTypeOptions = [
  { value: "HERO", label: "Destaque" },
  { value: "TEXT", label: "Texto" },
  { value: "FEATURES", label: "Benefícios" },
  { value: "CALL_TO_ACTION", label: "Chamada para ação" },
  { value: "FAQ", label: "Perguntas frequentes" },
  { value: "CONTACT", label: "Contato" },
] as const;

const templateOptions = [
  { value: "BLANK", label: "Em branco" },
  { value: "LEAD_CAPTURE", label: "Captação de lead" },
  { value: "SERVICE_PROMOTION", label: "Promoção de serviço" },
] as const;

function createBlock(type: BlockType): LandingPageBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "HERO":
      return {
        id,
        type,
        eyebrow: null,
        heading: "Novo destaque",
        body: null,
        primary_action: null,
      };
    case "TEXT":
      return { id, type, heading: null, body: "Novo conteúdo" };
    case "FEATURES":
      return {
        id,
        type,
        heading: "Benefícios",
        items: [{ title: "Novo benefício", body: "Descreva o benefício." }],
      };
    case "CALL_TO_ACTION":
      return {
        id,
        type,
        heading: "Pronto para começar?",
        body: null,
        action: { label: "Fale conosco", href: "/contato" },
      };
    case "FAQ":
      return {
        id,
        type,
        heading: "Perguntas frequentes",
        items: [{ question: "Nova pergunta", answer: "Informe a resposta." }],
      };
    case "CONTACT":
      return {
        id,
        type,
        heading: "Entre em contato",
        body: null,
        submit_label: "Enviar",
        success_message: "Recebemos seus dados.",
      };
  }
}

function optionalText(value: string): string | null {
  return value || null;
}

type BlockEditorProps = {
  block: LandingPageBlock;
  index: number;
  total: number;
  onChange: (block: LandingPageBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

function BlockEditor({
  block,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: BlockEditorProps) {
  const label = blockTypeOptions.find((option) => option.value === block.type)?.label;

  return (
    <Card variant="outlined" padding="sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-hp-foreground">
            Bloco {index + 1}: {label}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              Subir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              Descer
            </Button>
            <Button size="sm" variant="danger" onClick={onRemove}>
              Remover
            </Button>
          </div>
        </div>

        {block.type === "HERO" ? (
          <>
            <Input
              label="Sobretítulo"
              value={block.eyebrow ?? ""}
              maxLength={80}
              onChange={(event) =>
                onChange({ ...block, eyebrow: optionalText(event.target.value) })
              }
            />
            <Input
              label="Título"
              required
              value={block.heading}
              maxLength={120}
              onChange={(event) => onChange({ ...block, heading: event.target.value })}
            />
            <Textarea
              label="Texto"
              value={block.body ?? ""}
              maxLength={1000}
              showCount
              onChange={(event) =>
                onChange({ ...block, body: optionalText(event.target.value) })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Texto do botão"
                value={block.primary_action?.label ?? ""}
                maxLength={60}
                onChange={(event) => {
                  const labelValue = event.target.value;
                  onChange({
                    ...block,
                    primary_action: labelValue
                      ? { label: labelValue, href: block.primary_action?.href ?? "/" }
                      : null,
                  });
                }}
              />
              <Input
                label="Destino do botão"
                value={block.primary_action?.href ?? ""}
                description="Use uma rota interna ou URL HTTPS."
                onChange={(event) => {
                  const href = event.target.value;
                  onChange({
                    ...block,
                    primary_action: href
                      ? { label: block.primary_action?.label ?? "Saiba mais", href }
                      : null,
                  });
                }}
              />
            </div>
          </>
        ) : null}

        {block.type === "TEXT" ? (
          <>
            <Input
              label="Título"
              value={block.heading ?? ""}
              maxLength={120}
              onChange={(event) =>
                onChange({ ...block, heading: optionalText(event.target.value) })
              }
            />
            <Textarea
              label="Conteúdo"
              required
              value={block.body}
              maxLength={5000}
              showCount
              onChange={(event) => onChange({ ...block, body: event.target.value })}
            />
          </>
        ) : null}

        {block.type === "FEATURES" ? (
          <>
            <Input
              label="Título"
              value={block.heading ?? ""}
              maxLength={120}
              onChange={(event) =>
                onChange({ ...block, heading: optionalText(event.target.value) })
              }
            />
            {block.items.map((item, itemIndex) => (
              <div
                key={`${block.id}-feature-${itemIndex}`}
                className="grid gap-3 rounded-[var(--radius-md)] bg-hp-surface-subtle p-3 sm:grid-cols-[1fr_2fr_auto]"
              >
                <Input
                  label={`Benefício ${itemIndex + 1}`}
                  required
                  value={item.title}
                  maxLength={100}
                  onChange={(event) => {
                    const items = block.items.map((current, currentIndex) =>
                      currentIndex === itemIndex
                        ? { ...current, title: event.target.value }
                        : current,
                    );
                    onChange({ ...block, items });
                  }}
                />
                <Textarea
                  label="Descrição"
                  required
                  value={item.body}
                  maxLength={500}
                  onChange={(event) => {
                    const items = block.items.map((current, currentIndex) =>
                      currentIndex === itemIndex
                        ? { ...current, body: event.target.value }
                        : current,
                    );
                    onChange({ ...block, items });
                  }}
                />
                <Button
                  className="self-end"
                  size="sm"
                  variant="ghost"
                  disabled={block.items.length === 1}
                  onClick={() =>
                    onChange({
                      ...block,
                      items: block.items.filter((_, currentIndex) => currentIndex !== itemIndex),
                    })
                  }
                >
                  Excluir
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={block.items.length >= 12}
              onClick={() =>
                onChange({
                  ...block,
                  items: [
                    ...block.items,
                    { title: "Novo benefício", body: "Descreva o benefício." },
                  ],
                })
              }
            >
              Adicionar benefício
            </Button>
          </>
        ) : null}

        {block.type === "CALL_TO_ACTION" ? (
          <>
            <Input
              label="Título"
              required
              value={block.heading}
              maxLength={120}
              onChange={(event) => onChange({ ...block, heading: event.target.value })}
            />
            <Textarea
              label="Texto"
              value={block.body ?? ""}
              maxLength={1000}
              showCount
              onChange={(event) =>
                onChange({ ...block, body: optionalText(event.target.value) })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Texto do botão"
                required
                value={block.action.label}
                maxLength={60}
                onChange={(event) =>
                  onChange({
                    ...block,
                    action: { ...block.action, label: event.target.value },
                  })
                }
              />
              <Input
                label="Destino do botão"
                required
                value={block.action.href}
                description="Use uma rota interna ou URL HTTPS."
                onChange={(event) =>
                  onChange({
                    ...block,
                    action: { ...block.action, href: event.target.value },
                  })
                }
              />
            </div>
          </>
        ) : null}

        {block.type === "FAQ" ? (
          <>
            <Input
              label="Título"
              value={block.heading ?? ""}
              maxLength={120}
              onChange={(event) =>
                onChange({ ...block, heading: optionalText(event.target.value) })
              }
            />
            {block.items.map((item, itemIndex) => (
              <div
                key={`${block.id}-faq-${itemIndex}`}
                className="space-y-3 rounded-[var(--radius-md)] bg-hp-surface-subtle p-3"
              >
                <Input
                  label={`Pergunta ${itemIndex + 1}`}
                  required
                  value={item.question}
                  maxLength={200}
                  onChange={(event) => {
                    const items = block.items.map((current, currentIndex) =>
                      currentIndex === itemIndex
                        ? { ...current, question: event.target.value }
                        : current,
                    );
                    onChange({ ...block, items });
                  }}
                />
                <Textarea
                  label="Resposta"
                  required
                  value={item.answer}
                  maxLength={2000}
                  showCount
                  onChange={(event) => {
                    const items = block.items.map((current, currentIndex) =>
                      currentIndex === itemIndex
                        ? { ...current, answer: event.target.value }
                        : current,
                    );
                    onChange({ ...block, items });
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={block.items.length === 1}
                  onClick={() =>
                    onChange({
                      ...block,
                      items: block.items.filter((_, currentIndex) => currentIndex !== itemIndex),
                    })
                  }
                >
                  Excluir pergunta
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={block.items.length >= 20}
              onClick={() =>
                onChange({
                  ...block,
                  items: [
                    ...block.items,
                    { question: "Nova pergunta", answer: "Informe a resposta." },
                  ],
                })
              }
            >
              Adicionar pergunta
            </Button>
          </>
        ) : null}

        {block.type === "CONTACT" ? (
          <>
            <Input
              label="Título"
              required
              value={block.heading}
              maxLength={120}
              onChange={(event) => onChange({ ...block, heading: event.target.value })}
            />
            <Textarea
              label="Texto"
              value={block.body ?? ""}
              maxLength={1000}
              showCount
              onChange={(event) =>
                onChange({ ...block, body: optionalText(event.target.value) })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Texto do botão"
                required
                value={block.submit_label}
                maxLength={60}
                onChange={(event) =>
                  onChange({ ...block, submit_label: event.target.value })
                }
              />
              <Input
                label="Mensagem de sucesso"
                required
                value={block.success_message}
                maxLength={240}
                onChange={(event) =>
                  onChange({ ...block, success_message: event.target.value })
                }
              />
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

type LandingPageEditorProps = {
  draft: LandingPageDraft;
  onChange: (draft: LandingPageDraft) => void;
};

export default function LandingPageEditor({ draft, onChange }: LandingPageEditorProps) {
  function updateField(field: "name" | "slug", value: string) {
    onChange({ ...draft, [field]: value });
  }

  function updateSeo(field: keyof LandingPageSeo, value: string | boolean) {
    onChange({
      ...draft,
      seo: {
        ...draft.seo,
        [field]: typeof value === "string" ? optionalText(value) : value,
      },
    });
  }

  function updateBlocks(blocks: LandingPageBlock[]) {
    onChange({ ...draft, content: { version: 1, blocks } });
  }

  function addBlock(event: ChangeEvent<HTMLSelectElement>) {
    const type = event.target.value as BlockType | "";
    if (!type) return;
    updateBlocks([...draft.content.blocks, createBlock(type)]);
    event.target.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nome interno"
          required
          value={draft.name}
          maxLength={150}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <Input
          label="Slug"
          required
          value={draft.slug}
          maxLength={120}
          description="Use letras minúsculas, números e hífens."
          onChange={(event) => updateField("slug", event.target.value.toLowerCase())}
        />
      </div>
      <Select
        label="Modelo"
        value={draft.template}
        options={templateOptions}
        onChange={(event) =>
          onChange({ ...draft, template: event.target.value as LandingPageTemplate })
        }
      />

      <section aria-labelledby="landing-page-blocks-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="landing-page-blocks-title" className="text-lg font-semibold text-hp-foreground">
              Conteúdo estruturado
            </h2>
            <p className="text-sm text-hp-muted">
              Organize até 50 blocos. HTML livre não é aceito.
            </p>
          </div>
          <Select
            className="min-w-56"
            label="Adicionar bloco"
            value=""
            options={[{ value: "", label: "Selecione" }, ...blockTypeOptions]}
            disabled={draft.content.blocks.length >= 50}
            onChange={addBlock}
          />
        </div>

        {draft.content.blocks.length === 0 ? (
          <Card variant="subtle" padding="sm">
            <p className="text-sm text-hp-muted">
              Adicione ao menos um bloco antes de publicar.
            </p>
          </Card>
        ) : null}

        {draft.content.blocks.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            index={index}
            total={draft.content.blocks.length}
            onChange={(nextBlock) =>
              updateBlocks(
                draft.content.blocks.map((current) =>
                  current.id === block.id ? nextBlock : current,
                ),
              )
            }
            onMove={(direction) => {
              const targetIndex = index + direction;
              if (targetIndex < 0 || targetIndex >= draft.content.blocks.length) return;
              const blocks = [...draft.content.blocks];
              [blocks[index], blocks[targetIndex]] = [blocks[targetIndex], blocks[index]];
              updateBlocks(blocks);
            }}
            onRemove={() =>
              updateBlocks(draft.content.blocks.filter((current) => current.id !== block.id))
            }
          />
        ))}
      </section>

      <section aria-labelledby="landing-page-seo-title" className="space-y-4">
        <div>
          <h2 id="landing-page-seo-title" className="text-lg font-semibold text-hp-foreground">
            SEO
          </h2>
          <p className="text-sm text-hp-muted">Metadados opcionais para publicação.</p>
        </div>
        <Input
          label="Título SEO"
          value={draft.seo.title ?? ""}
          maxLength={60}
          onChange={(event) => updateSeo("title", event.target.value)}
        />
        <Textarea
          label="Descrição SEO"
          value={draft.seo.description ?? ""}
          maxLength={160}
          showCount
          onChange={(event) => updateSeo("description", event.target.value)}
        />
        <Input
          label="URL canônica"
          type="url"
          value={draft.seo.canonical_url ?? ""}
          description="Quando informada, deve usar HTTPS."
          onChange={(event) => updateSeo("canonical_url", event.target.value)}
        />
        <label className="flex min-h-11 items-center gap-3 text-sm text-hp-foreground">
          <input
            type="checkbox"
            checked={draft.seo.no_index}
            onChange={(event) => updateSeo("no_index", event.target.checked)}
          />
          Impedir indexação por mecanismos de busca
        </label>
      </section>
    </div>
  );
}
