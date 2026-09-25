import type {
  LandingPageContent,
  LandingPageTemplate,
} from "@/services/landing-page-service";

type IdFactory = () => string;

export function createLandingPageTemplateContent(
  template: LandingPageTemplate,
  createId: IdFactory = () => crypto.randomUUID(),
): LandingPageContent {
  if (template === "BLANK") {
    return { version: 1, blocks: [] };
  }

  if (template === "LEAD_CAPTURE") {
    return {
      version: 1,
      blocks: [
        {
          id: createId(),
          type: "HERO",
          eyebrow: "Atendimento personalizado",
          heading: "Uma solução feita para você",
          body: "Apresente o principal benefício da sua oferta e incentive o primeiro contato.",
          primary_action: { label: "Quero saber mais", href: "/#contato" },
        },
        {
          id: createId(),
          type: "FEATURES",
          heading: "Por que escolher nossa empresa?",
          items: [
            {
              title: "Atendimento próximo",
              body: "Explique como sua equipe acompanha cada cliente.",
            },
            {
              title: "Experiência confiável",
              body: "Destaque um diferencial relevante da sua operação.",
            },
            {
              title: "Resultado claro",
              body: "Mostre o valor que o cliente pode esperar da solução.",
            },
          ],
        },
        {
          id: createId(),
          type: "CONTACT",
          heading: "Fale com nossa equipe",
          body: "Preencha seus dados para receber um atendimento personalizado.",
          submit_label: "Solicitar contato",
          success_message: "Recebemos seus dados. Em breve entraremos em contato.",
        },
      ],
    };
  }

  return {
    version: 1,
    blocks: [
      {
        id: createId(),
        type: "HERO",
        eyebrow: "Serviço em destaque",
        heading: "Apresente seu serviço principal",
        body: "Explique de forma objetiva o problema resolvido e o benefício entregue.",
        primary_action: { label: "Agendar atendimento", href: "/agenda" },
      },
      {
        id: createId(),
        type: "TEXT",
        heading: "Como funciona",
        body: "Descreva aqui as principais etapas do serviço e o que o cliente precisa saber antes de contratar.",
      },
      {
        id: createId(),
        type: "FEATURES",
        heading: "Diferenciais do serviço",
        items: [
          {
            title: "Benefício principal",
            body: "Explique o benefício mais importante para o cliente.",
          },
          {
            title: "Atendimento especializado",
            body: "Apresente a experiência da equipe responsável.",
          },
          {
            title: "Jornada transparente",
            body: "Mostre como o cliente acompanha cada etapa.",
          },
        ],
      },
      {
        id: createId(),
        type: "FAQ",
        heading: "Perguntas frequentes",
        items: [
          {
            question: "Para quem este serviço é indicado?",
            answer: "Descreva o perfil de cliente que mais se beneficia do serviço.",
          },
          {
            question: "Como posso contratar?",
            answer: "Explique o próximo passo para agendamento ou contato.",
          },
        ],
      },
      {
        id: createId(),
        type: "CALL_TO_ACTION",
        heading: "Vamos começar?",
        body: "Escolha o melhor horário para conversar com nossa equipe.",
        action: { label: "Agendar agora", href: "/agenda" },
      },
    ],
  };
}
