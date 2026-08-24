# Checklist de deploy seguro

## Convites, recuperação de senha e email transacional

- Verificar domínio e remetente do Resend.
- Configurar `RESEND_API_KEY` somente no backend/secret manager.
- Revisar `EMAIL_FROM`, `FRONTEND_PUBLIC_URL`, `USER_INVITATION_TTL_HOURS` e
  `PASSWORD_RESET_TTL_MINUTES` por ambiente.
- Garantir que logs, observabilidade e analytics não capturem tokens de convite
  ou redefinição de senha.
- Concluir smoke test real de convite e aceite com endereço controlado.
- Confirmar resposta indistinguível para email existente e inexistente em
  `forgot-password`, incluindo rate limit e `Retry-After`.
- Confirmar uso único e expiração do reset, revogação dos resets anteriores e
  invalidação dos access tokens antigos por `auth_version`.
- Confirmar troca de senha em `/minha-conta`, encerramento da sessão atual e
  autenticação posterior apenas com a senha nova.

Este checklist é obrigatório antes da exposição pública da HPTECH Platform.

## Ambiente e segredos

- Definir `APP_ENV=production`, `DATABASE_URL` e um `JWT_SECRET` aleatório com
  pelo menos 32 caracteres e entropia adequada no cofre do ambiente.
- Definir `CORS_ORIGINS` somente com origens HTTPS explícitas.
- Definir `API_URL` no servidor Next.js com a URL privada da API; nunca usar
  prefixo `NEXT_PUBLIC_` para essa configuração.
- Manter ambientes de desenvolvimento, teste e produção segregados. Não
  versionar `.env`, credenciais, cookies ou tokens.
- Confirmar `Secure` nos cookies e terminação HTTPS antes de liberar tráfego.

## Banco, migration e primeiro OWNER

1. Fazer backup verificável do PostgreSQL.
2. Executar `python -m alembic heads` e `python -m alembic upgrade head` em
   janela controlada.
3. Confirmar a tabela persistida de rate limiting.
4. Para uma empresa previamente criada, executar em `services/api`:

   ```powershell
   python -m scripts.bootstrap_owner --company-slug empresa-exemplo --name "Owner Inicial" --email owner@example.com
   ```

   A senha é solicitada sem eco. Não existe signup público nem OWNER automático.

## Headers, rede e observabilidade

- Confirmar no endpoint público CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, proteção de frames, `Permissions-Policy` e HSTS.
- Confirmar que HSTS existe somente no ambiente de produção HTTPS.
- Preservar o BFF same-origin: o browser não recebe URL privada nem JWT.
- Configurar o proxy reverso e o servidor ASGI para que `request.client` seja o
  IP real confiável. Não aceitar cabeçalhos encaminhados de clientes diretos;
  limitar proxies confiáveis na infraestrutura.
- Encaminhar eventos agregados de login e respostas 401, 403 e 429 para a
  observabilidade. Nunca registrar senha, JWT, cookie, `Authorization`,
  `JWT_SECRET` ou `DATABASE_URL`.
- Audit trail administrativo completo (alteração de permissões e ações
  críticas) permanece uma evolução futura separada de `LeadHistory`.

## Rotação de JWT_SECRET

1. Gerar um novo segredo de alta entropia no cofre de produção.
2. Substituir o segredo no ambiente e reiniciar todas as instâncias da API.
3. Considerar todos os access tokens anteriores imediatamente inválidos e
   orientar novo login. O sistema não mantém múltiplas chaves neste ciclo.

## Validação e smoke test

Executar antes da publicação:

```powershell
cd services/api
pytest
python -m pip check
python -B -c "from app.main import app; print(app.title)"
cd ../..
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit --incremental false
pnpm --filter web build
pnpm audit --prod
git diff --check
```

Validar manualmente: login e logout de OWNER; Dashboard; CRM; movimentação e
persistência de Lead; login de VIEWER; CRM visível e read-only. Confirmar 429 e
`Retry-After` após o limite, sem diferença entre email desconhecido e senha
incorreta. Validar ainda os fluxos `forgot-password`, `reset-password` e
`change-password`, inclusive rejeição de replay e 401 para JWT emitido antes da
alteração de senha.
