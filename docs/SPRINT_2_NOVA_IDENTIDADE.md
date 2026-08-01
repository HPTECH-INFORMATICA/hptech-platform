# Sprint 2 — Nova Identidade da HPTECH Platform v2

## Blueprint Oficial da Interface

**Versão:** 1.0
**Status:** Blueprint para aprovação
**Projeto:** HPTECH Platform v2
**Referência normativa:** `docs/HPTECH_PLATFORM_V2.md`

---

# 1. Objetivos da Sprint 2

A Sprint 2 estabelece a identidade visual e a base de interação oficial da HPTECH Platform v2 antes da implementação de novas telas.

Objetivos:

- criar um Design System único para todos os Centros Operacionais;
- estabelecer um layout premium, limpo, previsível e responsivo;
- consolidar a navegação do Painel Operacional;
- definir componentes reutilizáveis e seus estados;
- preparar a interface para modo claro e escuro;
- garantir acessibilidade desde a base;
- reduzir inconsistências entre módulos;
- priorizar tarefas frequentes em até três cliques;
- preparar visualmente a plataforma para dados reais, IA e crescimento modular;
- permitir evolução sem quebrar a identidade oficial.

A Sprint não altera os cinco Centros Operacionais, os módulos, os planos, a stack ou o roadmap definidos no documento mestre.

---

# 2. Filosofia da Interface

A interface deve transmitir confiança clínica, precisão operacional e tecnologia acessível.

Princípios centrais:

- **Contexto primeiro:** o usuário deve compreender onde está, o que pode fazer e qual é o próximo passo.
- **Clareza antes de densidade:** mostrar primeiro a informação necessária para decidir ou agir.
- **Premium sem excesso:** acabamento sofisticado por proporção, tipografia, espaço e consistência, não por decoração.
- **Operação contínua:** fluxos frequentes devem evitar interrupções, recarregamentos e navegação desnecessária.
- **Progressive disclosure:** recursos avançados aparecem quando relevantes, sem sobrecarregar usuários iniciantes.
- **Confiança visível:** ações críticas, estados de sincronização e consequências devem ser explícitos.
- **IA assistiva:** a IA sugere, explica e acelera; nunca oculta decisões nem substitui revisão humana obrigatória.
- **Consistência transversal:** padrões de interação são iguais em todos os Centros Operacionais.
- **Mobile first:** toda capacidade essencial deve possuir experiência utilizável em telas pequenas.
- **Acessibilidade nativa:** acessibilidade não é uma adaptação posterior.

---

# 3. Design System

## 3.1 Grid

- Base: grid de 12 colunas no desktop.
- Tablet: grid de 8 colunas.
- Mobile: grid de 4 colunas.
- Largura máxima de conteúdo: `1440px`.
- Margens laterais:
  - desktop amplo: `32px`;
  - desktop: `24px`;
  - tablet: `20px`;
  - mobile: `16px`.
- Gutter:
  - desktop: `24px`;
  - tablet: `20px`;
  - mobile: `16px`.
- Conteúdo textual longo deve usar largura de leitura entre `640px` e `760px`.
- Dashboards podem ocupar a largura disponível respeitando o limite máximo.

## 3.2 Espaçamentos

A escala oficial usa múltiplos de quatro pixels:

| Token | Valor | Uso principal |
|---|---:|---|
| `space-0` | `0` | ausência de espaço |
| `space-1` | `4px` | ajustes internos mínimos |
| `space-2` | `8px` | ícone e texto, itens compactos |
| `space-3` | `12px` | controles compactos |
| `space-4` | `16px` | espaçamento padrão |
| `space-5` | `20px` | grupos de campos |
| `space-6` | `24px` | padding de cards e seções |
| `space-8` | `32px` | separação de blocos |
| `space-10` | `40px` | cabeçalhos amplos |
| `space-12` | `48px` | seções principais |
| `space-16` | `64px` | grandes divisões de página |

Valores fora da escala exigem justificativa de composição ou restrição técnica.

## 3.3 Radius

| Token | Valor | Uso principal |
|---|---:|---|
| `radius-none` | `0` | tabelas contínuas e divisores |
| `radius-sm` | `6px` | badges e controles pequenos |
| `radius-md` | `10px` | inputs e botões |
| `radius-lg` | `14px` | cards e dropdowns |
| `radius-xl` | `20px` | modais, drawers e painéis premium |
| `radius-full` | `9999px` | avatar, chips e indicadores circulares |

## 3.4 Sombras

Sombras devem comunicar elevação, nunca ornamentação.

| Token | Uso |
|---|---|
| `shadow-none` | superfícies no mesmo plano |
| `shadow-xs` | controles elevados e cards discretos |
| `shadow-sm` | dropdowns e elementos sticky |
| `shadow-md` | popovers, menus e cards em destaque |
| `shadow-lg` | modais e drawers |

No modo escuro, elevação deve combinar borda e contraste de superfície; sombras pretas isoladas não são suficientes.

## 3.5 Bordas

- Espessura padrão: `1px`.
- Espessura de foco: `2px`.
- Bordas devem usar tokens semânticos.
- Divisores substituem cards quando o agrupamento já é evidente.
- Bordas coloridas são reservadas para foco, seleção ou estado.
- Nenhum campo pode depender apenas da cor da borda para comunicar erro.

## 3.6 Tipografia

- Família principal: Geist Sans.
- Família monoespaçada: Geist Mono.
- Fallback sans-serif: `Arial, Helvetica, sans-serif`.
- Pesos permitidos: `400`, `500`, `600` e `700`.
- Texto corrido usa peso `400`.
- Labels e ações usam `500` ou `600`.
- Títulos usam `600` ou `700`.
- Texto em caixa alta deve ser restrito a labels muito curtos e possuir tracking adequado.
- Números financeiros e tabulares devem usar algarismos tabulares quando disponíveis.

## 3.7 Escala de títulos

| Token | Desktop | Mobile | Peso | Line-height |
|---|---:|---:|---:|---:|
| `display` | `40px` | `32px` | `700` | `1.15` |
| `heading-1` | `32px` | `28px` | `700` | `1.2` |
| `heading-2` | `24px` | `22px` | `600` | `1.25` |
| `heading-3` | `20px` | `18px` | `600` | `1.3` |
| `heading-4` | `16px` | `16px` | `600` | `1.4` |

Cada página deve possuir apenas um `heading-1` semântico.

## 3.8 Escala de textos

| Token | Tamanho | Line-height | Uso |
|---|---:|---:|---|
| `text-lg` | `18px` | `1.55` | destaques e introduções |
| `text-md` | `16px` | `1.5` | texto principal e inputs |
| `text-sm` | `14px` | `1.45` | tabelas, labels e metadados |
| `text-xs` | `12px` | `1.4` | legendas e informações auxiliares |

Texto funcional não deve ser menor que `12px`.

## 3.9 Ícones

- Um único conjunto de ícones outline deve ser adotado em toda a aplicação.
- Tamanhos oficiais: `16px`, `20px` e `24px`.
- Ícones de navegação: `20px`.
- Ícones em botões: `16px` ou `20px`.
- Ícone isolado exige nome acessível ou tooltip.
- Ícones não substituem labels em ações ambíguas.
- Espessura e estilo devem permanecer consistentes.
- Emojis não são ícones funcionais do produto.

## 3.10 Tokens de Design

Tokens devem ser a única fonte de valores visuais compartilhados.

Categorias obrigatórias:

- cores primitivas;
- cores semânticas;
- tipografia;
- espaçamento;
- radius;
- bordas;
- sombras;
- tamanhos de controles;
- breakpoints;
- z-index;
- duração e easing de motion.

Convenção:

- tokens primitivos descrevem valor, como `blue-600`;
- tokens semânticos descrevem função, como `action-primary`;
- componentes consomem tokens semânticos;
- módulos não criam cores, sombras ou espaçamentos locais sem aprovação do Design System.

Escala de z-index:

| Token | Valor | Uso |
|---|---:|---|
| `z-base` | `0` | conteúdo comum |
| `z-sticky` | `20` | headers e barras fixas |
| `z-dropdown` | `40` | menus e popovers |
| `z-overlay` | `60` | backdrop |
| `z-modal` | `80` | modal e drawer |
| `z-toast` | `100` | notificações temporárias |

---

# 4. Sistema de Cores

## 4.1 Identidade

A identidade combina azul profundo, que comunica confiança e tecnologia, com turquesa clínico, que comunica cuidado, clareza e evolução.

## 4.2 Paleta primária

| Token | Light | Dark | Uso |
|---|---|---|---|
| `brand-primary` | `#1746A2` | `#7EA6FF` | ações e identidade principal |
| `brand-primary-hover` | `#123A87` | `#9AB9FF` | hover |
| `brand-primary-active` | `#0D2F70` | `#B4CAFF` | estado pressionado |
| `brand-primary-soft` | `#EAF0FF` | `#17264A` | fundos e seleção suave |

## 4.3 Paleta secundária

| Token | Light | Dark | Uso |
|---|---|---|---|
| `brand-secondary` | `#087E8B` | `#58D2D9` | apoio visual e dados positivos |
| `brand-secondary-hover` | `#066A75` | `#7ADDE2` | hover |
| `brand-secondary-soft` | `#E5F7F8` | `#12383D` | fundos secundários |

## 4.4 Light

| Token | Valor |
|---|---|
| `background` | `#F6F8FC` |
| `surface` | `#FFFFFF` |
| `surface-subtle` | `#F1F4F9` |
| `surface-elevated` | `#FFFFFF` |
| `foreground` | `#172033` |
| `foreground-muted` | `#657086` |
| `foreground-subtle` | `#8791A5` |
| `border` | `#DDE3ED` |
| `border-strong` | `#C5CEDD` |
| `focus-ring` | `#4D7CFE` |

## 4.5 Dark

| Token | Valor |
|---|---|
| `background` | `#0B1020` |
| `surface` | `#12192B` |
| `surface-subtle` | `#182137` |
| `surface-elevated` | `#202A42` |
| `foreground` | `#F3F6FC` |
| `foreground-muted` | `#AAB4C8` |
| `foreground-subtle` | `#8490A8` |
| `border` | `#29344D` |
| `border-strong` | `#3A4763` |
| `focus-ring` | `#7EA6FF` |

## 4.6 Estados e feedback

| Estado | Light | Dark | Uso |
|---|---|---|---|
| `success` | `#16845B` | `#57D6A0` | conclusão e confirmação |
| `success-soft` | `#E5F7EF` | `#123B2D` | fundo de sucesso |
| `warning` | `#A96600` | `#F4B95B` | atenção e risco moderado |
| `warning-soft` | `#FFF4D8` | `#453317` | fundo de alerta |
| `danger` | `#C5353F` | `#FF7A83` | erro e ação destrutiva |
| `danger-soft` | `#FDEBEC` | `#481F27` | fundo de erro |
| `info` | `#2769C8` | `#76A9FA` | informação operacional |
| `info-soft` | `#E9F2FF` | `#172F52` | fundo informativo |

Regras:

- cor nunca será o único indicador de estado;
- textos sobre fundos coloridos devem atender contraste mínimo;
- estados disabled devem permanecer legíveis;
- ações destrutivas usam `danger` e exigem confirmação proporcional ao risco;
- gráficos devem usar paletas distinguíveis também sem percepção completa de cores.

---

# 5. Componentes Fundamentais

Todos os componentes devem oferecer estados default, hover, focus-visible, active, disabled, loading e error quando aplicável.

## 5.1 Estrutura

- **AppShell:** organiza Sidebar, Header, conteúdo, overlays e navegação responsiva.
- **Sidebar:** navegação primária por Centros e módulos permitidos.
- **Header:** contexto global, busca, notificações, empresa ativa e perfil.
- **Footer:** informações institucionais, versão, suporte e links necessários; discreto no painel.
- **PageHeader:** título, descrição, breadcrumb, ações principais e metadados da página.
- **Section:** agrupamento semântico com título, descrição e ações opcionais.
- **Card:** superfície de conteúdo com variantes default, interactive, selected e status.

## 5.2 Dados

- **Table:** dados tabulares simples e responsivos.
- **DataGrid:** grandes conjuntos com ordenação, seleção, filtros, paginação e colunas configuráveis.
- **Pagination:** navegação explícita, total e tamanho de página.
- **Charts:** visualizações acessíveis com legenda, tooltip, resumo textual e estado sem dados.
- **Calendar:** visões diária, semanal e mensal com navegação por teclado.
- **Kanban:** colunas por estágio, drag-and-drop acessível, seletor alternativo e rollback visual.

## 5.3 Navegação e organização

- **Tabs:** alternância entre painéis relacionados, sem substituir navegação profunda.
- **Stepper:** progresso de fluxos sequenciais.
- **Breadcrumb:** hierarquia contextual, omitido apenas quando a página é raiz de um Centro.
- **Dropdown:** lista curta de ações ou opções.
- **Search:** busca contextual ou global com label acessível.
- **Filters:** filtros persistentes, removíveis e com contagem ativa.

## 5.4 Entrada e ações

- **Button:** variantes primary, secondary, outline, ghost, danger e link.
- **Input:** label, ajuda, prefixo, sufixo, validação e mensagem de erro.
- **Select:** seleção simples ou múltipla; busca quando a lista for extensa.
- **Checkbox:** seleção independente ou múltipla.
- **Switch:** mudança binária com efeito imediato e reversível.
- **Textarea:** texto longo com contador quando houver limite.
- **Date/Time Input:** formato localizado, entrada por teclado e seletor visual.
- **File Upload:** tipo, tamanho, progresso, cancelamento e erro explícitos.

## 5.5 Feedback e sobreposição

- **Modal:** decisão focada que bloqueia temporariamente o contexto.
- **Dialog:** confirmação, alerta ou escolha curta.
- **Drawer:** edição ou detalhe contextual sem abandonar a página.
- **Toast:** confirmação temporária; não deve conter informação crítica exclusiva.
- **Tooltip:** explicação complementar, nunca conteúdo essencial.
- **Loading:** progresso indeterminado ou determinado sem bloquear toda a interface desnecessariamente.
- **Skeleton:** preserva estrutura durante carregamento inicial.
- **Empty State:** explica ausência, contexto e próxima ação possível.

## 5.6 Identidade e status

- **Badge:** estado curto e semântico.
- **Avatar:** pessoa ou empresa, com fallback textual.
- **Status Indicator:** combina cor, ícone e texto.
- **Progress:** percentual ou etapa com descrição acessível.

## 5.7 Contrato dos componentes

Cada componente deve definir:

- finalidade;
- anatomia;
- variantes;
- tamanhos;
- estados;
- comportamento responsivo;
- interação por teclado;
- atributos de acessibilidade;
- exemplos permitidos;
- usos proibidos;
- tokens consumidos;
- contrato de propriedades tipado.

---

# 6. Layout Oficial

## 6.1 Painel Administrativo

Estrutura:

1. Sidebar como navegação primária.
2. Header global fixo ou sticky.
3. Área principal com PageHeader.
4. Conteúdo organizado por Sections.
5. Camada global para modais, drawers e toasts.
6. Footer discreto quando aplicável.

O conteúdo deve identificar sempre o Centro, o módulo e a empresa ativa quando o contexto multiempresa estiver disponível.

## 6.2 Desktop

- Sidebar expandida: `256px`.
- Sidebar recolhida: `72px`.
- Header: `64px`.
- Conteúdo central fluido até `1440px`.
- Ação principal posicionada no PageHeader.
- Painéis secundários podem usar drawer lateral.
- Tabelas preservam cabeçalho e ações críticas visíveis.

## 6.3 Tablet

- Sidebar recolhida por padrão ou apresentada como drawer.
- Header preserva busca, notificações e perfil.
- Cards reorganizados em uma ou duas colunas.
- DataGrid reduz colunas secundárias e oferece detalhe expandido.
- Ações permanecem acessíveis sem hover.

## 6.4 Mobile

- Navegação principal por drawer acionado no Header.
- Conteúdo em uma coluna.
- Margem lateral de `16px`.
- Ações primárias podem usar barra inferior sticky quando o fluxo exigir.
- Tabelas complexas devem virar lista estruturada ou permitir rolagem claramente indicada.
- Modais amplos devem assumir comportamento de drawer inferior ou tela completa.
- Drag-and-drop deve possuir alternativa por seletor ou ação explícita.
- Alvos de toque devem possuir no mínimo `44px` por `44px`.

---

# 7. Navegação Oficial

## 7.1 Menu lateral

A navegação deve refletir os cinco Centros Operacionais congelados:

1. Centro Comercial.
2. Centro Clínico.
3. Centro Financeiro.
4. Centro Administrativo.
5. Centro de Inteligência.

Regras:

- módulos aparecem dentro do Centro responsável;
- permissões controlam visibilidade e acesso;
- itens não disponíveis no plano não simulam funcionalidade ativa;
- o item atual possui destaque visual e indicação acessível;
- grupos podem ser recolhidos sem perder orientação;
- favoritos ou recentes são atalhos, não uma nova arquitetura;
- a ordem oficial não deve variar arbitrariamente entre sessões.

## 7.2 Header

Deve comportar:

- acionador da navegação responsiva;
- identificação de contexto;
- busca global;
- notificações;
- empresa ativa, quando aplicável;
- perfil e preferências;
- acesso ao suporte.

## 7.3 Breadcrumb

- Representa Centro, módulo e página.
- Cada nível navegável deve possuir link.
- O último item identifica a página atual.
- Em mobile, pode ser condensado sem ocultar o contexto essencial.

## 7.4 Busca global

- Deve pesquisar apenas dados autorizados do tenant ativo.
- Resultados devem ser agrupados por tipo.
- Deve aceitar teclado e possuir estados loading, vazio e erro.
- Ações recentes podem aparecer antes da digitação.
- Dados clínicos sensíveis não devem ser expostos além da permissão do usuário.

## 7.5 Perfil

- Identidade do usuário.
- Empresa e função atuais.
- Preferências de tema e idioma quando disponíveis.
- Segurança da conta.
- Encerramento de sessão explícito.

## 7.6 Notificações

- Devem indicar estado lido e não lido.
- Devem conduzir ao contexto relacionado.
- Devem respeitar tenant, perfil e preferência.
- Informações clínicas sensíveis devem ser minimizadas.
- Notificações críticas não podem depender apenas de toast.

---

# 8. Princípios de UX

- Tarefas frequentes em até três cliques sempre que o fluxo permitir.
- Uma ação primária dominante por contexto.
- Feedback imediato para ações do usuário.
- Atualizações otimistas somente com rollback confiável.
- Dados digitados devem ser preservados em falhas recuperáveis.
- Erros devem explicar o problema e a recuperação possível.
- Confirmações devem ser proporcionais ao risco.
- Estados vazios devem orientar o próximo passo.
- Filtros ativos devem permanecer visíveis e removíveis.
- Preferências úteis devem ser preservadas por usuário.
- Terminologia deve refletir a linguagem das clínicas.
- Recursos indisponíveis devem ser explicados, não simulados.
- Fluxos clínicos, financeiros ou irreversíveis exigem clareza reforçada.
- IA deve identificar sugestões como conteúdo gerado e permitir revisão.

---

# 9. Princípios de UI

- Hierarquia visual clara em todas as páginas.
- Uso de espaço em branco para separar responsabilidades.
- Cards somente quando houver agrupamento ou elevação real.
- Consistência entre ícones, cores, radius e estados.
- Contraste suficiente nos dois temas.
- Labels visíveis em campos; placeholder não substitui label.
- Ações destrutivas visualmente distintas.
- Informações importantes não dependem apenas de cor.
- Densidade pode variar entre confortável e compacta sem quebrar componentes.
- Dados reais devem ocupar o destaque; decoração deve permanecer secundária.
- Componentes do Design System têm precedência sobre implementações locais.

---

# 10. Motion Design

Motion deve explicar mudança de estado, hierarquia ou continuidade.

Tokens:

| Token | Duração | Uso |
|---|---:|---|
| `motion-fast` | `120ms` | hover e feedback curto |
| `motion-base` | `180ms` | controles e menus |
| `motion-slow` | `280ms` | modal, drawer e reorganização |

Easings:

- entrada: `cubic-bezier(0.16, 1, 0.3, 1)`;
- saída: `cubic-bezier(0.4, 0, 1, 1)`;
- padrão: `cubic-bezier(0.2, 0, 0, 1)`.

Regras:

- animações não devem atrasar a operação;
- evitar movimentos decorativos contínuos;
- preservar posição e contexto em atualizações;
- drag-and-drop deve indicar origem, destino e resultado;
- loading não deve produzir layout shift evitável;
- respeitar `prefers-reduced-motion`;
- com redução ativada, remover deslocamentos e manter apenas feedback essencial.

---

# 11. Acessibilidade

Meta mínima: WCAG 2.2 nível AA.

Requisitos:

- HTML semântico;
- hierarquia correta de headings;
- navegação completa por teclado;
- foco visível e previsível;
- ordem de tabulação coerente;
- skip link para conteúdo principal;
- labels e descrições programáticas;
- mensagens de erro associadas aos campos;
- anúncios adequados para alterações assíncronas;
- contraste mínimo de `4.5:1` para texto comum;
- contraste mínimo de `3:1` para texto grande e elementos gráficos essenciais;
- alvos de toque de pelo menos `44px` por `44px`;
- zoom até 200% sem perda funcional;
- suporte a leitores de tela;
- alternativas ao drag-and-drop;
- gráficos com legenda e resumo textual;
- modais com foco contido e retorno ao elemento acionador;
- idioma da página configurado corretamente;
- testes automáticos e manuais de acessibilidade nos componentes fundamentais.

---

# 12. Responsividade

Breakpoints de referência:

| Token | Largura mínima |
|---|---:|
| `sm` | `640px` |
| `md` | `768px` |
| `lg` | `1024px` |
| `xl` | `1280px` |
| `2xl` | `1536px` |

Regras:

- componentes devem responder ao espaço disponível, não apenas ao dispositivo;
- conteúdo essencial nunca deve desaparecer sem alternativa;
- não depender de hover;
- evitar rolagem horizontal da página;
- grids devem reduzir colunas progressivamente;
- tipografia e espaçamento devem usar escalas responsivas controladas;
- filtros extensos migram para drawer no mobile;
- ações importantes permanecem alcançáveis com uma mão quando possível;
- estados devem ser validados em orientações retrato e paisagem.

---

# 13. Performance

- Priorizar Server Components quando não houver necessidade de interação no cliente.
- Limitar Client Components ao menor escopo interativo.
- Carregar módulos pesados sob demanda.
- Evitar bibliotecas duplicadas para a mesma função.
- Otimizar imagens e definir dimensões para evitar layout shift.
- Paginar ou virtualizar grandes conjuntos de dados.
- Debounce em buscas remotas sem prejudicar teclado ou leitor de tela.
- Evitar requisições duplicadas.
- Usar skeleton somente quando representar a estrutura real.
- Manter feedback imediato em operações demoradas.
- Medir Core Web Vitals e desempenho de fluxos críticos.
- Definir budgets antes da implementação:
  - nenhuma regressão bloqueante de acessibilidade ou navegação;
  - evitar aumento não justificado do bundle compartilhado;
  - páginas essenciais utilizáveis em conexão móvel comum;
  - interações críticas sem bloqueio perceptível da interface.

---

# 14. Internacionalização Futura

- Português do Brasil é o idioma inicial.
- Textos de interface não devem ser acoplados à lógica de negócio.
- Datas, horários, números, moedas e percentuais devem usar APIs de internacionalização.
- Fuso horário deve ser explícito nos dados e localizado na apresentação.
- Layouts devem aceitar expansão de texto.
- Componentes não devem depender de largura fixa de labels.
- Conteúdo gerado por IA deve respeitar idioma e contexto do tenant.
- A arquitetura visual deve permitir idiomas RTL futuramente, sem exigir suporte imediato nesta Sprint.

---

# 15. Regras Obrigatórias para Todos os Módulos

1. Respeitar integralmente `docs/HPTECH_PLATFORM_V2.md`.
2. Usar o AppShell e a navegação oficial.
3. Pertencer ao Centro Operacional definido no documento mestre.
4. Consumir tokens e componentes oficiais.
5. Não criar variações locais sem necessidade comprovada e aprovação.
6. Implementar estados loading, vazio, erro, sucesso e sem permissão.
7. Ser utilizável em desktop, tablet e mobile.
8. Atender WCAG 2.2 AA.
9. Respeitar tema claro e escuro.
10. Preservar isolamento de tenant em todo dado apresentado.
11. Minimizar exposição de dados pessoais e clínicos.
12. Oferecer feedback para toda ação assíncrona.
13. Proteger ações destrutivas ou irreversíveis.
14. Não apresentar mocks como dados reais.
15. Manter contratos tipados e limites claros entre módulos.
16. Identificar conteúdo gerado por IA e exigir revisão quando aplicável.
17. Registrar decisões excepcionais antes da implementação.

---

# 16. O que NÃO Deve Ser Feito

- Reorganizar os cinco Centros Operacionais.
- Renomear ou reinterpretar módulos sem aprovação arquitetural.
- Criar uma navegação paralela à oficial.
- Usar cores, fontes, espaçamentos ou sombras fora dos tokens.
- Duplicar componentes fundamentais dentro de módulos.
- Misturar regras de domínio com componentes puramente visuais.
- Criar telas desktop sem estratégia mobile.
- Ocultar ações essenciais apenas em hover.
- Usar placeholder como label.
- Comunicar estado somente por cor.
- Exibir dados falsos como reais.
- Criar dashboards decorativos sem fonte de dados legítima.
- Aplicar animações que atrasem tarefas.
- Introduzir dependências visuais redundantes.
- Confiar em `company_id` do cliente para autorização.
- Expor dados de outro tenant em busca, cache, notificações ou IA.
- Permitir que IA execute silenciosamente ações críticas.
- Prometer módulos futuros como funcionalidades disponíveis.
- Alterar stack ou arquitetura congelada por preferência técnica.

---

# 17. Critérios de Aceite da Sprint

A Sprint 2 será aceita quando:

- os tokens oficiais estiverem implementados em light e dark;
- os fundamentos de tipografia, grid, espaçamento, radius, bordas e sombras estiverem centralizados;
- AppShell, Sidebar, Header, PageHeader e estrutura de conteúdo estiverem implementados;
- a navegação representar corretamente os Centros Operacionais;
- os componentes fundamentais prioritários estiverem documentados e reutilizáveis;
- estados default, hover, focus, disabled, loading, error e empty estiverem cobertos;
- desktop, tablet e mobile estiverem validados;
- navegação por teclado e foco estiverem validados;
- contraste e acessibilidade automática não apresentarem erros bloqueantes;
- modo claro e escuro funcionarem sem perda de legibilidade;
- CRM existente estiver integrado à nova identidade sem regressão funcional;
- dashboard utilizar somente dados reais ou estado vazio legítimo;
- nenhuma informação mockada for apresentada como real;
- TypeScript, ESLint e build estiverem aprovados;
- não houver regressão nas integrações atuais do CRM;
- documentação dos componentes e decisões estiver atualizada;
- a revisão visual final for aprovada pelo responsável do produto.

---

# 18. Roadmap Interno da Sprint

## Etapa 1 — Fundação visual

- mapear a interface atual;
- implementar tokens primitivos e semânticos;
- configurar temas light e dark;
- aplicar tipografia, grid e escalas oficiais;
- validar contraste inicial.

## Etapa 2 — Componentes essenciais

- Button;
- Input;
- Select;
- Checkbox;
- Switch;
- Textarea;
- Badge;
- Avatar;
- Tooltip;
- Loading;
- Skeleton;
- Empty State.

## Etapa 3 — Estrutura do produto

- AppShell;
- Sidebar;
- Header;
- Footer;
- PageHeader;
- Section;
- Card;
- Breadcrumb;
- navegação responsiva.

## Etapa 4 — Dados e fluxos

- Table;
- DataGrid;
- Search;
- Filters;
- Pagination;
- Modal;
- Dialog;
- Drawer;
- Dropdown;
- Tabs;
- Toast.

## Etapa 5 — Componentes especializados

- Kanban;
- Charts;
- Calendar;
- Stepper;
- padrões de IA assistiva.

## Etapa 6 — Integração

- integrar o CRM real ao Design System;
- implementar o Dashboard Real ou estado vazio legítimo;
- aplicar a navegação oficial do Painel Operacional;
- validar permissões visuais sem antecipar a autenticação da Sprint 3;
- remover resíduos visuais do template anterior.

## Etapa 7 — Qualidade e aceite

- validar TypeScript;
- validar ESLint;
- validar build;
- validar acessibilidade automática e manual;
- validar light e dark;
- validar desktop, tablet e mobile;
- validar desempenho dos fluxos essenciais;
- revisar consistência visual;
- obter aprovação final do produto.

---

# Regra de Preservação

Este blueprint estende a identidade visual da HPTECH Platform v2 sem alterar sua arquitetura congelada.

Toda implementação da Sprint 2 deve preservar a visão, os Centros Operacionais, os módulos, as garantias transversais e a filosofia estabelecidos em `docs/HPTECH_PLATFORM_V2.md`.

“Não esqueça minha caloi.”
