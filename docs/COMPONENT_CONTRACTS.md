# Component Contracts

## Contratos Oficiais da HPTECH Platform v2

**Versão:** 1.0
**Status:** Documento para aprovação
**Escopo:** componentes reutilizáveis
**Referências normativas:**

- `docs/HPTECH_PLATFORM_V2.md`
- `docs/SPRINT_2_NOVA_IDENTIDADE.md`
- `docs/HPTECH_BRAND_SYSTEM.md`
- `docs/DESIGN_TOKENS.md`

---

# Fundamentos

# 1. Filosofia dos Componentes

Componentes são contratos reutilizáveis de comportamento, semântica, acessibilidade e identidade.

Princípios:

- uma responsabilidade principal por componente;
- composição antes de variações específicas de módulo;
- comportamento consistente em todos os Centros Operacionais;
- tokens oficiais como única fonte visual;
- acessibilidade integrada ao contrato;
- estados previsíveis e feedback explícito;
- regras de domínio permanecem fora de componentes puramente visuais;
- dados clínicos e multi-tenant são tratados pelo domínio, nunca inferidos pela apresentação;
- IA permanece identificável e sujeita à revisão humana;
- nenhuma abstração deve existir sem reutilização comprovada.

---

# 2. Regras de Composição

- componentes devem aceitar conteúdo semântico sem conhecer o módulo consumidor;
- composição deve preservar hierarquia de headings e landmarks;
- componentes interativos não podem ser aninhados de forma inválida;
- elementos clicáveis usam semântica nativa apropriada;
- overlays compartilham gestão consistente de foco e camada;
- estado controlado é preferido quando o domínio precisa coordenar comportamento;
- estado interno é permitido apenas para interação local sem impacto externo;
- callbacks comunicam intenção e resultado, não detalhes visuais;
- slots opcionais não devem quebrar alinhamento quando ausentes;
- variantes não podem alterar a finalidade fundamental do componente;
- componentes de módulo podem compor os contratos oficiais, mas não duplicá-los.

---

# 3. Convenção de Nomenclatura

- nomes de componentes usam PascalCase;
- nomes representam função: `Button`, não aparência como `BlueButton`;
- propriedades usam camelCase;
- handlers começam com `on` e descrevem o evento: `onOpenChange`;
- booleanos usam prefixos `is`, `has`, `can` ou `should` quando isso melhora clareza;
- variantes usam vocabulário comum: `primary`, `secondary`, `outline`, `ghost`, `danger`;
- tamanhos usam `sm`, `md` e `lg`;
- estados de carregamento usam `isLoading`;
- textos acessíveis usam nomes explícitos como `accessibleLabel`;
- nomes não incluem Centro ou módulo quando o contrato é transversal.

---

# 4. Estrutura das Propriedades

Categorias conceituais:

| Categoria | Finalidade |
|---|---|
| Identidade | `id`, nome e associação semântica |
| Conteúdo | label, título, descrição, children ou itens |
| Aparência | variant, size e density dentro dos valores oficiais |
| Estado | value, open, selected, checked, disabled, loading e error |
| Comportamento | callbacks e regras de interação |
| Acessibilidade | accessibleLabel, describedBy e relações ARIA necessárias |
| Layout | alinhamento e largura apenas quando previstos pelo contrato |
| Dados | coleções tipadas, chaves estáveis e metadados explícitos |

Regras:

- propriedades obrigatórias devem ser mínimas e inequívocas;
- defaults precisam ser documentados;
- não expor propriedades que permitam valores visuais arbitrários;
- não aceitar HTML inseguro como conteúdo padrão;
- propriedades de dados não podem transportar informação além da necessária;
- tipos públicos não devem depender de detalhes internos;
- mudanças incompatíveis exigem versionamento.

---

# 5. Estados Obrigatórios de Todos os Componentes

Quando aplicável, todo componente deve cobrir:

- default;
- hover;
- focus-visible;
- active;
- selected ou checked;
- disabled;
- read-only;
- loading;
- success;
- warning;
- error;
- empty;
- sem permissão;
- offline ou falha de sincronização.

Regras globais:

- loading preserva dimensões e evita ação duplicada;
- erro informa recuperação possível;
- disabled permanece legível;
- read-only não parece indisponível;
- foco é visível nos temas light e dark;
- estado não depende somente de cor;
- atualizações otimistas exigem rollback visual confiável.

---

# Componentes Base

# 6. Button

**Finalidade:** executar uma ação explícita.

**Propriedades:** label ou conteúdo acessível, `variant`, `size`, tipo de ação, `disabled`, `isLoading`, ícone inicial, ícone final e callback de ativação.

**Variantes:** primary, secondary, outline, ghost, danger e link.

**Regras:** uma ação primária dominante por contexto; loading mantém label ou alternativa acessível; danger é reservado a ações destrutivas; largura total é permitida em mobile.

**Acessibilidade:** ativação por teclado, foco visível, nome acessível e estado disabled real.

---

# 7. IconButton

**Finalidade:** executar ação reconhecível usando somente ícone.

**Propriedades:** ícone, `accessibleLabel` obrigatório, `variant`, `size`, `disabled`, `isLoading`, tooltip opcional e callback.

**Regras:** alvo mínimo de `44px`; não usar para ações ambíguas sem tooltip; não substituir Button quando label visível for necessária.

**Acessibilidade:** nome acessível obrigatório, foco visível e tooltip disponível também por teclado.

---

# 8. Input

**Finalidade:** receber texto curto ou valor formatado.

**Propriedades:** label, name, value, defaultValue, type, placeholder, helpText, errorMessage, required, disabled, readOnly, prefixo, sufixo, limite e callbacks.

**Estados:** vazio, preenchido, focus, disabled, read-only, validando, válido e erro.

**Regras:** label sempre visível; placeholder não substitui label; controle vem
imediatamente após o label; ajuda e erro aparecem abaixo do controle; textos
auxiliares opcionais não podem deslocar o controle em relação ao campo vizinho;
dados são preservados em falha.

**Acessibilidade:** associação entre label, ajuda e erro; autocomplete adequado; teclado coerente no mobile.

---

# 9. Textarea

**Finalidade:** receber texto multilinha.

**Propriedades:** contrato do Input, número inicial de linhas, limite, contador e redimensionamento permitido.

**Regras:** crescimento não pode ocultar ações críticas; contador aparece quando houver limite; não reduzir a área abaixo da altura mínima.

**Acessibilidade:** label e mensagens associadas; contador anunciado sem interromper digitação.

---

# 10. Select

**Finalidade:** selecionar uma ou mais opções de conjunto definido.

**Propriedades:** label, opções com chave estável, value, multiple, searchable, placeholder, required, disabled, loading, emptyMessage, errorMessage e callbacks.

**Regras:** busca para listas extensas; opção selecionada permanece explícita; não usar para escolha binária imediata; opções indisponíveis explicam o motivo quando necessário.

**Acessibilidade:** teclado completo, foco previsível, estado expanded e relação com lista.

---

# 11. Checkbox

**Finalidade:** selecionar escolhas independentes ou itens em conjunto.

**Propriedades:** label, checked, indeterminate, disabled, required, description e callback.

**Estados:** unchecked, checked e indeterminate.

**Regras:** label clicável; grupos possuem legenda; indeterminate não substitui valor de domínio.

**Acessibilidade:** semântica nativa, teclado e estado misto anunciado.

---

# 12. Radio

**Finalidade:** selecionar exatamente uma opção entre alternativas mutuamente exclusivas.

**Propriedades:** nome do grupo, opções, value, disabled, required, orientação, descrição e callback.

**Regras:** usar quando opções importantes devem permanecer visíveis; Select é preferível para listas extensas.

**Acessibilidade:** grupo com legenda, navegação por setas e seleção anunciada.

---

# 13. Switch

**Finalidade:** alterar configuração binária com efeito imediato e reversível.

**Propriedades:** label, checked, disabled, description, pending e callback.

**Regras:** não usar para submissão futura de formulário; comunicar salvamento e rollback; label descreve estado ou capacidade.

**Acessibilidade:** role apropriado, estado anunciado e ativação por teclado.

---

# 14. DatePicker

**Finalidade:** selecionar data ou intervalo com entrada textual e calendário.

**Propriedades:** label, value, range, minDate, maxDate, locale, timezone, disabledDates, required, errorMessage e callbacks.

**Regras:** formato localizado; digitação permitida; datas indisponíveis explicáveis; timezone explícito quando houver horário associado.

**Responsividade:** popover no desktop e apresentação ampliada no mobile.

**Acessibilidade:** navegação por teclado no calendário, anúncio de mês e data selecionada.

---

# 15. SearchBox

**Finalidade:** realizar busca contextual ou global.

**Propriedades:** label, query, placeholder, debounce, loading, clearable, scope, resultCount, shortcut e callbacks.

**Estados:** inicial, digitando, loading, resultados, vazio e erro.

**Regras:** não buscar dados fora do tenant ou permissão; botão limpar acessível; debounce não bloqueia submissão explícita.

**Acessibilidade:** label mesmo quando visualmente oculto, resultados anunciados com moderação e teclado previsível.

---

# Feedback

# 16. Alert

**Finalidade:** comunicar informação persistente dentro do fluxo.

**Propriedades:** variant, title, description, ícone, ação opcional e dismissible.

**Variantes:** info, success, warning e danger.

**Regras:** mensagem crítica não pode ser descartável sem consequência; combinar texto, ícone e cor.

**Acessibilidade:** role proporcional à urgência; foco não deve ser movido automaticamente em alertas informativos.

---

# 17. Toast

**Finalidade:** confirmar evento temporário não crítico.

**Propriedades:** variant, title, description, duration, action, dismissible e identificador.

**Regras:** não conter informação crítica exclusiva; limitar empilhamento; pausar duração sob interação; evitar toast para erros de campo.

**Acessibilidade:** live region adequada e tempo suficiente para leitura.

---

# 18. Dialog

**Finalidade:** solicitar confirmação ou decisão curta.

**Propriedades:** open, title, description, ação principal, ação secundária, danger, preventDismiss e callback de mudança.

**Regras:** texto explicita consequência; ação destrutiva nomeia o resultado; não usar para formulários extensos.

**Acessibilidade:** foco contido, Escape quando seguro, retorno de foco e título associado.

---

# 19. Modal

**Finalidade:** apresentar tarefa focada que interrompe temporariamente o contexto.

**Propriedades:** open, title, description, size, content, footer, closePolicy e callbacks.

**Tamanhos:** sm, md, lg e xl conforme tokens oficiais.

**Responsividade:** modal central no desktop; tela completa ou drawer inferior no mobile quando amplo.

**Acessibilidade:** foco contido, fundo inerte, rolagem controlada e retorno de foco.

---

# 20. Drawer

**Finalidade:** exibir detalhe, edição ou navegação sem abandonar a página.

**Propriedades:** open, side, size, title, description, content, footer, closePolicy e callbacks.

**Regras:** preservar contexto; não empilhar drawers; alterações não salvas exigem proteção.

**Responsividade:** lateral no desktop; inferior ou tela completa no mobile.

**Acessibilidade:** mesmas garantias de foco de Modal.

---

# 21. Tooltip

**Finalidade:** fornecer explicação curta complementar.

**Propriedades:** content, placement, delay, disabled e relação com acionador.

**Regras:** nunca conter conteúdo essencial ou ação; texto curto; não substituir label.

**Acessibilidade:** disponível por hover e foco; fechamento por Escape; não capturar foco.

---

# 22. Popover

**Finalidade:** apresentar conteúdo contextual leve ou controles breves.

**Propriedades:** open, trigger, placement, alignment, content, modalBehavior e callbacks.

**Regras:** fechar ao perder contexto quando seguro; não usar para fluxos extensos; posicionamento deve evitar corte.

**Acessibilidade:** gestão de foco conforme interatividade e relação explícita com acionador.

---

# Navegação

# 23. Sidebar

**Finalidade:** navegação primária pelos cinco Centros Operacionais e seus módulos.

**Propriedades:** items, activePath, expandedGroups, collapsed, permissions, planAvailability, tenantContext e callbacks.

**Regras:** ordem oficial dos Centros preservada; permissões controlam visibilidade; indisponibilidade não simula recurso ativo; favoritos não criam nova arquitetura.

**Responsividade:** `256px` expandida, `72px` recolhida; drawer no mobile.

**Acessibilidade:** landmark de navegação, item atual anunciado e recolhimento acessível.

---

# 24. TopBar

**Finalidade:** fornecer contexto global e ações recorrentes no topo do AppShell.

**Propriedades:** navigationTrigger, context, globalSearch, notifications, tenant, profile, support e sticky.

**Regras:** altura oficial de `64px`; prioridade para contexto, busca e perfil; dados sensíveis minimizados.

**Responsividade:** ações secundárias podem ser condensadas, sem ocultar contexto essencial.

**Acessibilidade:** landmark apropriado, ordem de foco previsível e labels para ações por ícone.

---

# 25. Breadcrumb

**Finalidade:** representar hierarquia entre Centro, módulo e página.

**Propriedades:** items com label e destino, currentLabel, separator e maxItems.

**Regras:** último item identifica a página atual; níveis navegáveis possuem destino; não duplicar título.

**Responsividade:** condensar níveis intermediários no mobile preservando origem e página atual.

**Acessibilidade:** navegação nomeada, lista semântica e página atual anunciada.

---

# 26. Tabs

**Finalidade:** alternar painéis relacionados no mesmo contexto.

**Propriedades:** items, value, orientation, lazy, disabledItems e callback.

**Regras:** não substituir rotas profundas; labels curtos; estado pode refletir URL quando relevante.

**Responsividade:** rolagem horizontal indicada ou alternativa compacta sem truncar contexto.

**Acessibilidade:** padrão de tabs, setas, Home, End e relação tab/panel.

---

# 27. Pagination

**Finalidade:** navegar entre páginas de um conjunto de dados.

**Propriedades:** page, pageSize, totalItems, totalPages, pageSizeOptions e callbacks.

**Regras:** exibir total e contexto; preservar filtros; mudança de página reposiciona foco de forma previsível.

**Responsividade:** reduzir números intermediários, preservando anterior, próxima e página atual.

**Acessibilidade:** navegação nomeada e página atual anunciada.

---

# 28. Menu

**Finalidade:** agrupar ações relacionadas.

**Propriedades:** items, groups, activeItem, disabledItems, orientation e callbacks.

**Regras:** ações usam verbos; separadores refletem grupos reais; danger fica visualmente distinto; não misturar navegação e seleção sem semântica clara.

**Acessibilidade:** teclado completo, foco gerenciado e estado disabled anunciado.

---

# 29. Dropdown

**Finalidade:** abrir Menu contextual a partir de acionador.

**Propriedades:** trigger, items, open, placement, alignment, closeOnSelect e callbacks.

**Regras:** acionador indica expansão; posicionamento não pode cortar ações; itens frequentes não devem ficar escondidos sem necessidade.

**Acessibilidade:** estado expanded, relação com menu e retorno de foco.

## 29.1 RowActionsMenu

**Finalidade:** concentrar as ações de um registro em tabelas e cards sem
alterar a largura das colunas conforme o conteúdo.

**Regras:** usar um acionador de três pontos com alvo mínimo de `40px`, alinhado
à direita; empregar verbos e o nome do objeto nos itens; separar ações
destrutivas; manter a mesma ordem entre desktop e mobile; não exibir mensagens
longas dentro da célula de ações. A coluna visual possui largura compacta e o
cabeçalho "Ações" permanece disponível para leitores de tela.

**Acessibilidade:** o acionador recebe nome contextual por registro, oferece
navegação completa por teclado e devolve o foco após a seleção.

---

# Dados

# 30. Table

**Finalidade:** apresentar dados tabulares simples para leitura e comparação.

**Propriedades:** columns, rows, rowKey, caption, density, sorting, loading, emptyState, errorState e ações.

**Regras:** primeira coluna identifica registro; números à direita; cabeçalhos semânticos; hover não é requisito; dados sensíveis respeitam permissão.

**Responsividade:** lista estruturada ou rolagem claramente indicada.

**Acessibilidade:** caption, headers associados e ordenação anunciada.

---

# 31. DataGrid

**Finalidade:** manipular conjuntos grandes com seleção, filtros, ordenação e paginação.

**Propriedades:** contrato de Table mais selection, columnVisibility, resizing, pinning, pagination, filters, bulkActions e virtualization.

**Regras:** estado persistente quando útil; ações em lote confirmam escopo; virtualização não pode quebrar teclado ou leitor de tela.

**Responsividade:** reduzir colunas e oferecer detalhe expandido; não comprimir conteúdo crítico.

**Acessibilidade:** modelo de navegação documentado e seleção anunciada.

---

# 32. Card

**Finalidade:** agrupar conteúdo, estado ou interação relacionados.

**Propriedades:** variant, title, description, content, footer, action, selected, status e padding.

**Variantes:** default, interactive, selected, status, metric e compact.

**Regras:** não aninhar repetidamente; Card interativo possui um destino principal; usar divisores quando elevação não for necessária.

**Acessibilidade:** foco visível quando interativo e estrutura semântica apropriada.

---

# 33. StatCard

**Finalidade:** exibir uma métrica resumida com contexto.

**Propriedades:** label, value, unit, period, comparison, trend, status, description e destination.

**Regras:** valor sempre acompanhado de contexto; tendência informa base de comparação; não usar dados mockados; cor não comunica tendência sozinha.

**Acessibilidade:** leitura textual completa da métrica e variação.

---

# 34. Timeline

**Finalidade:** representar eventos em ordem temporal.

**Propriedades:** items com id, timestamp, title, description, actor, status e metadata; order; loading e emptyState.

**Regras:** timezone explícito; eventos auditáveis não devem ser editados visualmente; detalhes sensíveis dependem de permissão.

**Acessibilidade:** lista semântica e data legível, não apenas visual.

---

# 35. KanbanColumn

**Finalidade:** agrupar KanbanCards por estágio.

**Propriedades:** id, title, count, items, colorToken, loading, emptyState, canReceive, collapsed e callbacks de movimento.

**Regras:** título e contagem sempre visíveis; cor é apoio; destino inválido deve ser bloqueado e explicado; scroll não pode ocultar contexto.

**Acessibilidade:** região nomeada e alternativa de movimento sem drag-and-drop.

---

# 36. KanbanCard

**Finalidade:** representar item acionável dentro do Kanban.

**Propriedades:** id, title, subtitle, metadata, badges, assignee, selected, draggable, destination e callbacks.

**Estados:** default, hover, focus, selected, dragging, updating, error e disabled.

**Regras:** atualização otimista exige rollback; seletor alternativo atualiza o mesmo estado; não expor dados sensíveis desnecessários.

**Acessibilidade:** acionável por teclado, instruções de movimento e anúncio do resultado.

---

# 37. EmptyState

**Finalidade:** explicar ausência e orientar próxima ação.

**Propriedades:** type, title, description, icon ou illustration, primaryAction, secondaryAction e helpLink.

**Tipos:** firstUse, noResults, filtered, noPermission, unavailable e loadFailure.

**Regras:** distinguir vazio de erro; não simular conteúdo; linguagem objetiva; ilustração discreta.

**Acessibilidade:** título semântico e ação com nome explícito.

---

# 38. Skeleton

**Finalidade:** representar estrutura durante carregamento inicial.

**Propriedades:** variant, dimensions, count e accessibleLabel quando necessário.

**Regras:** reproduzir a geometria real; evitar animação excessiva; não substituir progresso de ação iniciada pelo usuário.

**Acessibilidade:** decorativo por padrão; container comunica carregamento; respeitar reduced motion.

---

# 39. Avatar

**Finalidade:** representar pessoa ou empresa.

**Propriedades:** src, alt, name, fallback, size, status e shape.

**Regras:** fallback usa iniciais estáveis; imagem de pessoa exige texto alternativo adequado; status não depende somente de cor.

**Acessibilidade:** decorativo quando acompanhado do nome; informativo quando isolado.

---

# 40. Badge

**Finalidade:** comunicar status ou categoria curta.

**Propriedades:** label, variant, icon, removable e callback de remoção.

**Variantes:** neutral, primary, success, warning, danger, info e center.

**Regras:** texto curto; não usar como botão sem comportamento explícito; cor combinada com label.

**Acessibilidade:** significado completo disponível em texto.

---

# IA

# 41. AIMessage

**Finalidade:** apresentar mensagem gerada ou assistida por IA em conversa.

**Propriedades:** id, role, content, timestamp, modelDisclosure, status, citations, feedback e actions.

**Estados:** generating, complete, interrupted, error e outdated.

**Regras:** identificar IA; não apresentar inferência como fato; permitir copiar e avaliar; dados sensíveis minimizados.

**Acessibilidade:** geração anunciada sem excesso e conteúdo navegável por teclado.

---

# 42. AIInsight

**Finalidade:** apresentar observação inferida de dados com contexto.

**Propriedades:** title, summary, evidence, period, confidence, generatedAt, sourceScope e destination.

**Regras:** diferenciar dado, inferência e recomendação; explicar base; não usar confiança como garantia; respeitar tenant.

**Acessibilidade:** insight completo em texto, sem depender de gráfico ou cor.

---

# 43. AIRecommendation

**Finalidade:** sugerir ação revisável ao usuário.

**Propriedades:** title, rationale, evidence, riskLevel, expectedImpact, primaryAction, dismissAction e reviewRequired.

**Regras:** revisão humana obrigatória em ações clínicas, financeiras ou irreversíveis; consequência explícita; rejeição sempre disponível.

**Acessibilidade:** risco e necessidade de revisão anunciados textualmente.

---

# 44. AIAction

**Finalidade:** representar ação proposta pela IA antes de execução.

**Propriedades:** actionLabel, scope, affectedItems, preview, permissions, reversible, confirmationLevel, executionStatus e callbacks.

**Regras:** nunca executar silenciosamente ação crítica; exibir escopo; exigir permissão; confirmar estado final; oferecer rollback quando possível.

**Acessibilidade:** foco em consequência e controles claramente nomeados.

---

# 45. AIConversation

**Finalidade:** organizar interação contínua entre usuário e assistente.

**Propriedades:** messages, inputState, contextDisclosure, capabilities, suggestedPrompts, loading, error, history e callbacks.

**Regras:** contexto de tenant explícito e isolado; não enviar dados desnecessários; indicar limites; preservar revisão humana; fallback seguro.

**Responsividade:** leitura em uma coluna; input permanece acessível sem cobrir conteúdo.

**Acessibilidade:** ordem de mensagens, live region moderada e controle total por teclado.

---

# Dashboard

# 46. ChartCard

**Finalidade:** apresentar gráfico com contexto e ações relacionadas.

**Propriedades:** title, description, period, chart, legend, summary, loading, emptyState, errorState, actions e destination.

**Regras:** título responde uma pergunta; período e unidade explícitos; resumo textual obrigatório; nenhuma visualização decorativa.

**Acessibilidade:** alternativa textual e dados essenciais disponíveis sem tooltip.

---

# 47. KPI Card

**Finalidade:** destacar indicador-chave de desempenho.

**Propriedades:** label, value, unit, period, target, comparison, trend, status, explanation e destination.

**Regras:** reservado a métricas realmente prioritárias; comparação nomeada; máximo visual controlado por seção; dados reais.

**Acessibilidade:** leitura completa do valor, unidade, período e tendência.

---

# 48. DashboardSection

**Finalidade:** agrupar indicadores, gráficos ou listas que respondem à mesma questão operacional.

**Propriedades:** title, description, periodContext, actions, layout, content, loading, emptyState e errorState.

**Regras:** uma pergunta principal por seção; ordem por prioridade; não aninhar seções; preservar linguagem entre Centros.

**Responsividade:** grid reduz progressivamente sem alterar hierarquia.

**Acessibilidade:** heading semântico e região identificável quando necessário.

---

# Regras Globais

# 49. Responsividade

- mobile first;
- breakpoints oficiais: `640px`, `768px`, `1024px`, `1280px` e `1536px`;
- conteúdo essencial nunca desaparece sem alternativa;
- não depender de hover;
- alvos de toque de no mínimo `44px`;
- componentes respondem ao container quando aplicável;
- overlays amplos adaptam sua apresentação no mobile;
- tabelas e grids preservam contexto em telas pequenas;
- drag-and-drop sempre possui alternativa explícita.

---

# 50. Acessibilidade

Meta mínima: WCAG 2.2 AA.

- semântica nativa antes de ARIA;
- teclado completo;
- foco visível e previsível;
- contraste de `4.5:1` para texto comum e `3:1` para texto grande e elementos essenciais;
- zoom de 200% sem perda funcional;
- nomes, labels e descrições programáticos;
- estados assíncronos anunciados com moderação;
- cor nunca é indicador exclusivo;
- reduced motion respeitado;
- overlays restauram foco;
- testes automáticos e manuais obrigatórios.

---

# 51. Performance

- limitar lógica client-side ao necessário;
- evitar dependências duplicadas;
- lazy loading apenas sem prejudicar descoberta e foco;
- virtualização somente quando necessária e acessível;
- dimensões estáveis evitam layout shift;
- componentes não realizam requisições duplicadas;
- callbacks não devem produzir renders globais desnecessários;
- loading deve oferecer feedback imediato;
- impacto no bundle compartilhado deve ser medido;
- componentes especializados são carregados sob demanda quando possível.

---

# 52. Internacionalização

- português brasileiro é o idioma inicial;
- textos não ficam acoplados à lógica;
- datas, números, moedas e percentuais são localizados;
- timezone é explícito;
- componentes aceitam expansão de texto;
- labels não dependem de largura fixa;
- pluralização deve ser correta;
- conteúdo de IA respeita idioma do tenant;
- contratos não impedem futuro suporte RTL.

---

# 53. Evolução de Componentes

Uma evolução exige:

1. problema comprovado;
2. inventário de consumidores;
3. compatibilidade com documentos congelados;
4. impacto em estados e acessibilidade;
5. impacto responsivo e de performance;
6. estratégia de migração;
7. aprovação explícita;
8. atualização do contrato e testes.

Variantes não podem ser adicionadas apenas por preferência de um módulo.

---

# 54. Versionamento

Adotar versionamento semântico para contratos públicos:

- **patch:** correção sem mudança de contrato;
- **minor:** capacidade compatível e opcional;
- **major:** mudança incompatível, remoção ou alteração semântica.

Regras:

- propriedades não são removidas diretamente;
- descontinuação deve ser documentada;
- substituto e prazo de migração devem ser informados;
- mudanças visuais sistêmicas seguem governança dos tokens;
- comportamento incompatível exige aprovação e plano de migração.

---

# 55. Critérios para Criação de Novos Componentes

Um novo componente somente pode ser criado quando:

- não pertence à lista atual nem pode ser obtido por composição legítima;
- resolve problema reutilizável em mais de um contexto ou requisito estrutural comprovado;
- possui responsabilidade clara;
- respeita tokens, marca e arquitetura;
- define propriedades, variantes e estados;
- define responsividade e acessibilidade;
- não duplica componente existente;
- não incorpora regra de domínio indevida;
- possui impacto de performance avaliado;
- tem estratégia de documentação, testes e versionamento;
- foi aprovado explicitamente antes da implementação.

Proibições:

- criar componente para evitar composição simples;
- nomear por cor, página ou preferência local;
- copiar componente e alterar detalhes visuais;
- introduzir dependência externa sem auditoria;
- criar linguagem paralela por Centro Operacional.

---

# Regra de Preservação

Estes contratos materializam componentes reutilizáveis sem alterar a arquitetura, a identidade ou os Design Tokens congelados da HPTECH Platform v2.

Toda implementação futura deve seguir estes contratos e preservar a regra:

“Não esqueça minha caloi.”
