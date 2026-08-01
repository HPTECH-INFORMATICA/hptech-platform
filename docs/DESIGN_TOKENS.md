# Design Tokens Oficiais

## HPTECH Platform v2

**Versão:** 1.0
**Status:** Documento para aprovação
**Escopo:** linguagem visual e contratos de tokens
**Referências normativas:**

- `docs/HPTECH_PLATFORM_V2.md`
- `docs/SPRINT_2_NOVA_IDENTIDADE.md`
- `docs/HPTECH_BRAND_SYSTEM.md`

---

# 1. Filosofia dos Design Tokens

Os Design Tokens são a fonte oficial dos valores visuais da HPTECH Platform v2.

Eles existem para:

- preservar a identidade entre todos os Centros Operacionais;
- separar intenção semântica de valor visual;
- manter equivalência entre light e dark;
- reduzir valores arbitrários e duplicação;
- garantir consistência entre produto, marca e dados;
- permitir evolução controlada sem fragmentar interfaces;
- tornar acessibilidade e responsividade propriedades sistêmicas.

Princípios:

- componentes consomem tokens semânticos, não valores brutos;
- tokens primitivos não devem ser usados diretamente quando existir equivalente semântico;
- cor nunca será o único indicador de estado;
- tokens de Centro Operacional comunicam contexto, não autorização nem severidade;
- tokens de dados não substituem tokens de feedback;
- light e dark devem preservar função e hierarquia, não igualdade literal de cores;
- novos tokens exigem necessidade comprovada e aprovação.

---

# 2. Estrutura dos Tokens

## Camadas

### Primitivos

Valores básicos sem contexto, como cores, dimensões e durações.

Exemplos conceituais:

- `color.blue.700`;
- `dimension.4`;
- `duration.fast`.

### Semânticos

Representam função na interface.

Exemplos:

- `color.action.primary`;
- `color.text.muted`;
- `color.border.default`;
- `shadow.overlay`.

### De componente

Mapeiam decisões específicas de componentes para tokens semânticos.

Exemplos:

- `button.primary.background`;
- `table.row.height`;
- `modal.radius`.

## Convenção de nomes

Formato conceitual:

`categoria.elemento.variante.estado`

Regras:

- nomes descrevem função, não aparência circunstancial;
- usar inglês técnico consistente nos identificadores;
- documentação e explicações permanecem em português;
- temas alteram valores, não nomes;
- nomes não incluem módulo quando a função é transversal;
- tokens específicos de Centro usam o namespace `center`;
- tokens de gráficos usam o namespace `chart`.

---

# 3. Escala Oficial de Espaçamento

Base: múltiplos de `4px`.

| Token | Valor | Uso principal |
|---|---:|---|
| `space.0` | `0` | ausência de espaço |
| `space.1` | `4px` | ajuste mínimo |
| `space.2` | `8px` | ícone e texto |
| `space.3` | `12px` | controles compactos |
| `space.4` | `16px` | espaçamento padrão |
| `space.5` | `20px` | grupos de campos |
| `space.6` | `24px` | cards e seções |
| `space.8` | `32px` | blocos de conteúdo |
| `space.10` | `40px` | cabeçalhos amplos |
| `space.12` | `48px` | seções principais |
| `space.16` | `64px` | divisões de página |

Regras:

- `space.4` é a unidade padrão de composição;
- `space.6` é o padding padrão de Card;
- formulários usam `space.5` entre grupos;
- valores fora da escala exigem restrição técnica documentada;
- valores negativos não são tokens de espaçamento oficiais.

---

# 4. Border Radius

| Token | Valor | Uso principal |
|---|---:|---|
| `radius.none` | `0` | tabelas contínuas e divisores |
| `radius.sm` | `6px` | badges e controles pequenos |
| `radius.md` | `10px` | inputs e botões |
| `radius.lg` | `14px` | cards e dropdowns |
| `radius.xl` | `20px` | modais, drawers e painéis premium |
| `radius.full` | `9999px` | avatars, chips e indicadores |

Regras:

- radius comunica família visual, não hierarquia sozinho;
- componentes aninhados usam radius igual ou menor que o contêiner;
- tabelas internas não recebem radius em cada linha;
- elementos circulares usam `radius.full` apenas quando sua anatomia exigir.

---

# 5. Sistema de Sombras

## Light

| Token | Valor |
|---|---|
| `shadow.none` | `none` |
| `shadow.xs` | `0 1px 2px rgba(23, 32, 51, 0.06)` |
| `shadow.sm` | `0 4px 12px rgba(23, 32, 51, 0.08)` |
| `shadow.md` | `0 12px 28px rgba(23, 32, 51, 0.12)` |
| `shadow.lg` | `0 24px 56px rgba(23, 32, 51, 0.18)` |

## Dark

| Token | Valor |
|---|---|
| `shadow.none` | `none` |
| `shadow.xs` | `0 1px 2px rgba(0, 0, 0, 0.20)` |
| `shadow.sm` | `0 4px 12px rgba(0, 0, 0, 0.28)` |
| `shadow.md` | `0 12px 28px rgba(0, 0, 0, 0.36)` |
| `shadow.lg` | `0 24px 56px rgba(0, 0, 0, 0.46)` |

Regras:

- sombras comunicam elevação real;
- superfícies no mesmo plano usam borda ou divisor;
- modo dark combina sombra, borda e contraste de superfície;
- não criar sombras coloridas para módulos;
- foco usa focus ring, nunca sombra decorativa.

---

# 6. Sistema de Elevação

| Nível | Superfície | Borda | Sombra | Uso |
|---|---|---|---|---|
| `elevation.0` | `background` | nenhuma | `shadow.none` | plano da página |
| `elevation.1` | `surface` | `border.default` | `shadow.xs` | Card e controle elevado |
| `elevation.2` | `surface.elevated` | `border.default` | `shadow.sm` | Header sticky e dropdown |
| `elevation.3` | `surface.elevated` | `border.strong` | `shadow.md` | popover e painel flutuante |
| `elevation.4` | `surface.elevated` | `border.strong` | `shadow.lg` | modal e drawer |

Elevação visual e z-index são sistemas relacionados, mas independentes.

---

# 7. Escala Tipográfica

Família principal: Geist Sans.

Família monoespaçada: Geist Mono.

| Token | Desktop | Mobile | Peso padrão | Line-height |
|---|---:|---:|---:|---:|
| `type.display` | `40px` | `32px` | `700` | `1.15` |
| `type.heading.1` | `32px` | `28px` | `700` | `1.20` |
| `type.heading.2` | `24px` | `22px` | `600` | `1.25` |
| `type.heading.3` | `20px` | `18px` | `600` | `1.30` |
| `type.heading.4` | `16px` | `16px` | `600` | `1.40` |
| `type.text.lg` | `18px` | `18px` | `400` | `1.55` |
| `type.text.md` | `16px` | `16px` | `400` | `1.50` |
| `type.text.sm` | `14px` | `14px` | `400` | `1.45` |
| `type.text.xs` | `12px` | `12px` | `400` | `1.40` |

Texto funcional não deve ser menor que `12px`.

---

# 8. Pesos de Fonte

| Token | Valor | Uso |
|---|---:|---|
| `font.weight.regular` | `400` | texto corrido |
| `font.weight.medium` | `500` | labels e ênfase moderada |
| `font.weight.semibold` | `600` | ações e títulos intermediários |
| `font.weight.bold` | `700` | títulos principais |

Não usar pesos não definidos sem validação de legibilidade e carregamento.

---

# 9. Altura de Linha

| Token | Valor | Uso |
|---|---:|---|
| `line.tight` | `1.15` | display |
| `line.snug` | `1.20` | heading-1 |
| `line.heading` | `1.30` | títulos intermediários |
| `line.compact` | `1.40` | labels e textos curtos |
| `line.normal` | `1.50` | texto e controles |
| `line.relaxed` | `1.55` | introduções e leitura longa |

---

# 10. Paleta Semântica

## Marca e ações

| Token | Light | Dark |
|---|---|---|
| `color.action.primary` | `#1746A2` | `#7EA6FF` |
| `color.action.primary.hover` | `#123A87` | `#9AB9FF` |
| `color.action.primary.active` | `#0D2F70` | `#B4CAFF` |
| `color.action.primary.soft` | `#EAF0FF` | `#17264A` |
| `color.action.secondary` | `#087E8B` | `#58D2D9` |
| `color.action.secondary.hover` | `#066A75` | `#7ADDE2` |
| `color.action.secondary.soft` | `#E5F7F8` | `#12383D` |

## Feedback

| Token | Light | Dark |
|---|---|---|
| `color.success` | `#16845B` | `#57D6A0` |
| `color.success.soft` | `#E5F7EF` | `#123B2D` |
| `color.warning` | `#A96600` | `#F4B95B` |
| `color.warning.soft` | `#FFF4D8` | `#453317` |
| `color.danger` | `#C5353F` | `#FF7A83` |
| `color.danger.soft` | `#FDEBEC` | `#481F27` |
| `color.info` | `#2769C8` | `#76A9FA` |
| `color.info.soft` | `#E9F2FF` | `#172F52` |

---

# 11. Paleta Neutra

| Token | Light | Dark |
|---|---|---|
| `color.background` | `#F6F8FC` | `#0B1020` |
| `color.surface` | `#FFFFFF` | `#12192B` |
| `color.surface.subtle` | `#F1F4F9` | `#182137` |
| `color.surface.elevated` | `#FFFFFF` | `#202A42` |
| `color.text` | `#172033` | `#F3F6FC` |
| `color.text.muted` | `#657086` | `#AAB4C8` |
| `color.text.subtle` | `#8791A5` | `#8490A8` |
| `color.text.inverse` | `#FFFFFF` | `#0B1020` |
| `color.border` | `#DDE3ED` | `#29344D` |
| `color.border.strong` | `#C5CEDD` | `#3A4763` |
| `color.overlay` | `rgba(11, 16, 32, 0.52)` | `rgba(0, 0, 0, 0.68)` |
| `color.focus` | `#4D7CFE` | `#7EA6FF` |

---

# 12. Paleta por Centro Operacional

As cores dos Centros ajudam na orientação. Não substituem nome, ícone, permissão ou estado.

| Centro | Token | Light | Dark | Soft light | Soft dark |
|---|---|---|---|---|---|
| Comercial | `color.center.commercial` | `#2769C8` | `#76A9FA` | `#E9F2FF` | `#172F52` |
| Clínico | `color.center.clinical` | `#087E8B` | `#58D2D9` | `#E5F7F8` | `#12383D` |
| Financeiro | `color.center.financial` | `#16845B` | `#57D6A0` | `#E5F7EF` | `#123B2D` |
| Administrativo | `color.center.administrative` | `#657086` | `#AAB4C8` | `#F1F4F9` | `#29344D` |
| Inteligência | `color.center.intelligence` | `#6D4BD1` | `#B39BFF` | `#F0EBFF` | `#302653` |

Regras:

- a ordem dos Centros permanece a do documento mestre;
- a cor aparece como acento controlado, não como tema independente;
- áreas densas continuam usando neutros;
- sucesso, alerta e erro usam seus próprios tokens;
- textos sobre cores de Centro exigem contraste AA.

---

# 13. Estados

## Interação

| Token | Definição |
|---|---|
| `state.hover.opacity` | `0.92` apenas quando não houver cor hover específica |
| `state.active.opacity` | `0.84` apenas quando não houver cor active específica |
| `state.disabled.opacity` | `0.48` |
| `state.focus.width` | `2px` |
| `state.focus.offset` | `2px` |
| `state.focus.color` | `color.focus` |

## Regras

- hover reforça, mas não revela ação exclusiva;
- active confirma pressão sem deslocamento excessivo;
- focus-visible deve ser sempre perceptível;
- disabled permanece legível e não interativo;
- loading preserva dimensões e impede ação duplicada;
- selected combina superfície, borda e indicação acessível;
- error combina mensagem, ícone e cor;
- read-only não deve parecer disabled.

---

# 14. Duração das Animações

| Token | Valor | Uso |
|---|---:|---|
| `duration.instant` | `0ms` | mudança sem transição |
| `duration.fast` | `120ms` | hover e feedback curto |
| `duration.base` | `180ms` | controles e menus |
| `duration.slow` | `280ms` | modal, drawer e reorganização |
| `duration.emphasis` | `400ms` | confirmação excepcional não repetitiva |

`duration.emphasis` não deve ser usada em tarefas frequentes.

---

# 15. Curvas de Easing

| Token | Valor | Uso |
|---|---|---|
| `easing.standard` | `cubic-bezier(0.2, 0, 0, 1)` | transição comum |
| `easing.enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrada |
| `easing.exit` | `cubic-bezier(0.4, 0, 1, 1)` | saída |
| `easing.linear` | `linear` | progresso contínuo legítimo |

Com `prefers-reduced-motion`, deslocamentos devem ser removidos e durações reduzidas ao feedback essencial.

---

# 16. Breakpoints Responsivos

| Token | Valor | Referência |
|---|---:|---|
| `breakpoint.sm` | `640px` | mobile amplo |
| `breakpoint.md` | `768px` | tablet |
| `breakpoint.lg` | `1024px` | desktop |
| `breakpoint.xl` | `1280px` | desktop amplo |
| `breakpoint.2xl` | `1536px` | telas grandes |

Breakpoints orientam layout; componentes devem também responder ao espaço disponível.

---

# 17. Grid Oficial

| Contexto | Colunas | Margem | Gutter |
|---|---:|---:|---:|
| Mobile | `4` | `16px` | `16px` |
| Tablet | `8` | `20px` | `20px` |
| Desktop | `12` | `24px` | `24px` |
| Desktop amplo | `12` | `32px` | `24px` |

Tokens:

| Token | Valor |
|---|---:|
| `layout.content.max` | `1440px` |
| `layout.reading.min` | `640px` |
| `layout.reading.max` | `760px` |
| `layout.sidebar.expanded` | `256px` |
| `layout.sidebar.collapsed` | `72px` |
| `layout.header.height` | `64px` |
| `layout.touch.target` | `44px` |

---

# 18. Tokens para Ícones

| Token | Valor | Uso |
|---|---:|---|
| `icon.size.sm` | `16px` | ações compactas |
| `icon.size.md` | `20px` | padrão e navegação |
| `icon.size.lg` | `24px` | destaque e estados |
| `icon.stroke` | `1.75px` | espessura preferencial |
| `icon.gap` | `8px` | distância de label |
| `icon.button.size` | `44px` | alvo padrão de botão isolado |

Ícone isolado exige nome acessível. Emojis não são ícones funcionais.

---

# 19. Tokens para Gráficos

## Série categórica

| Token | Light | Dark |
|---|---|---|
| `chart.series.1` | `#2769C8` | `#76A9FA` |
| `chart.series.2` | `#087E8B` | `#58D2D9` |
| `chart.series.3` | `#6D4BD1` | `#B39BFF` |
| `chart.series.4` | `#C26A19` | `#F2A65A` |
| `chart.series.5` | `#B43A78` | `#F080B5` |
| `chart.series.6` | `#4E7A3E` | `#8CCB78` |
| `chart.series.7` | `#596579` | `#AAB4C8` |
| `chart.series.8` | `#8A5A22` | `#D8A15F` |

## Estrutura

| Token | Light | Dark |
|---|---|---|
| `chart.axis` | `#657086` | `#AAB4C8` |
| `chart.grid` | `#DDE3ED` | `#29344D` |
| `chart.tooltip.background` | `#172033` | `#F3F6FC` |
| `chart.tooltip.text` | `#FFFFFF` | `#0B1020` |
| `chart.reference` | `#8791A5` | `#8490A8` |

Regras:

- máximo recomendado de oito séries;
- combinar cor com label, forma ou padrão;
- não usar feedback semântico como série categórica por conveniência;
- validar contraste e daltonismo antes da implementação final.

---

# 20. Tokens para Tabelas

| Token | Valor |
|---|---|
| `table.header.height` | `44px` |
| `table.row.height.compact` | `44px` |
| `table.row.height.default` | `52px` |
| `table.cell.padding.x` | `16px` |
| `table.cell.padding.y` | `12px` |
| `table.radius` | `radius.lg` |
| `table.border` | `color.border` |
| `table.header.background` | `color.surface.subtle` |
| `table.row.background` | `color.surface` |
| `table.row.hover` | `color.action.primary.soft` |
| `table.row.selected` | `color.action.primary.soft` |
| `table.text` | `color.text` |
| `table.text.muted` | `color.text.muted` |

Hover nunca será requisito para acessar ações.

---

# 21. Tokens para Formulários

| Token | Valor |
|---|---|
| `control.height.sm` | `36px` |
| `control.height.md` | `44px` |
| `control.height.lg` | `48px` |
| `control.padding.x.sm` | `12px` |
| `control.padding.x.md` | `16px` |
| `control.padding.x.lg` | `20px` |
| `control.gap` | `8px` |
| `control.radius` | `radius.md` |
| `control.border.width` | `1px` |
| `control.focus.width` | `2px` |
| `control.focus.offset` | `2px` |
| `control.background` | `color.surface` |
| `control.text` | `color.text` |
| `control.placeholder` | `color.text.subtle` |
| `control.border` | `color.border.strong` |
| `control.border.hover` | `color.action.primary` |
| `control.border.error` | `color.danger` |
| `control.disabled.opacity` | `0.48` |
| `form.field.gap` | `8px` |
| `form.group.gap` | `20px` |

`control.height.sm` é restrito a ambientes densos com alvo interativo total acessível. Mobile usa no mínimo `control.height.md`.

---

# 22. Tokens para Cards

| Token | Valor |
|---|---|
| `card.padding.compact` | `16px` |
| `card.padding.default` | `24px` |
| `card.gap` | `16px` |
| `card.radius` | `radius.lg` |
| `card.background` | `color.surface` |
| `card.background.elevated` | `color.surface.elevated` |
| `card.border` | `color.border` |
| `card.border.selected` | `color.action.primary` |
| `card.shadow` | `shadow.xs` |
| `card.shadow.interactive` | `shadow.sm` |

Cards usam sombra apenas quando houver elevação ou interação real.

---

# 23. Tokens para Modais

| Token | Valor |
|---|---|
| `modal.width.sm` | `400px` |
| `modal.width.md` | `560px` |
| `modal.width.lg` | `760px` |
| `modal.width.xl` | `960px` |
| `modal.max.height` | `calc(100dvh - 48px)` |
| `modal.padding` | `24px` |
| `modal.gap` | `20px` |
| `modal.radius` | `radius.xl` |
| `modal.background` | `color.surface.elevated` |
| `modal.border` | `color.border.strong` |
| `modal.shadow` | `shadow.lg` |
| `modal.overlay` | `color.overlay` |
| `modal.z` | `80` |

Em mobile, modais amplos assumem drawer inferior ou tela completa e respeitam safe areas.

---

# 24. Tokens para Navegação

| Token | Valor |
|---|---|
| `nav.sidebar.width.expanded` | `256px` |
| `nav.sidebar.width.collapsed` | `72px` |
| `nav.header.height` | `64px` |
| `nav.item.height` | `44px` |
| `nav.item.padding.x` | `12px` |
| `nav.item.gap` | `12px` |
| `nav.item.radius` | `radius.md` |
| `nav.icon.size` | `20px` |
| `nav.background` | `color.surface` |
| `nav.border` | `color.border` |
| `nav.text` | `color.text.muted` |
| `nav.text.active` | `color.action.primary` |
| `nav.item.hover` | `color.surface.subtle` |
| `nav.item.active` | `color.action.primary.soft` |
| `nav.focus` | `color.focus` |
| `nav.sticky.z` | `20` |

A navegação representa os cinco Centros Operacionais na ordem oficial e não cria arquitetura paralela.

---

# 25. Regras de Evolução dos Tokens

## Fonte de verdade

Este documento é a especificação normativa. A futura implementação técnica deve reproduzi-lo sem alterar sua semântica.

## Inclusão

Um novo token somente pode ser criado quando:

- existe necessidade reutilizável;
- nenhum token atual expressa a mesma função;
- light e dark foram definidos;
- acessibilidade foi validada;
- impacto sobre componentes foi mapeado;
- nome e categoria respeitam a convenção;
- a alteração foi aprovada.

## Alteração

Alterar um token exige:

1. diagnóstico do problema;
2. inventário de consumidores;
3. avaliação visual e de acessibilidade;
4. estratégia de compatibilidade;
5. aprovação explícita;
6. atualização da documentação e testes visuais.

## Descontinuação

- tokens não são removidos diretamente;
- devem ser marcados como deprecated;
- um substituto deve ser indicado;
- consumidores devem migrar antes da remoção;
- remoções incompatíveis exigem versão maior do sistema visual.

## Proibições

- criar valores locais por preferência;
- usar cor hexadecimal diretamente em módulos quando existir token;
- criar temas independentes por Centro;
- usar tokens de Centro como estados de sucesso ou erro;
- alterar token para corrigir apenas um componente;
- reutilizar nomes com significado diferente;
- introduzir valores sem equivalência dark;
- quebrar contraste para preservar aparência;
- alterar os documentos congelados por conveniência de implementação.

## Governança

- toda exceção deve ser registrada;
- revisão do Product Owner é obrigatória para impacto de marca;
- revisão técnica é obrigatória para impacto transversal;
- testes de contraste e regressão visual acompanham mudanças;
- a regra “Não esqueça minha caloi” orienta toda evolução.

---

# Regra de Preservação

Os tokens oficiais materializam a identidade visual sem reorganizar a arquitetura congelada da HPTECH Platform v2.

Todos os módulos devem consumir a mesma linguagem semântica, preservando os Centros Operacionais, a acessibilidade, os temas light e dark e a identidade HPTECH.

“Não esqueça minha caloi.”
