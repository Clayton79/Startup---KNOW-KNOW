# Deploy gratuito

Arquitetura de produção: **Supabase** (banco, login, fotos) + **Render** (API) + **Cloudflare Pages** (site).
Tudo a partir do GitHub. Faça nesta ordem, anotando cada URL e chave.

> Eu não tenho acesso às suas contas: os passos abaixo são o que você precisa fazer. Eles foram escritos a
> partir da configuração do projeto, mas **não foram executados** contra provedores reais. Siga o
> checklist final e ajuste o que a interface de cada serviço tiver mudado.

## 1. Supabase

1. Crie um projeto em <https://supabase.com> e guarde a senha do banco.
2. **Settings → API**: copie `Project URL` (`SUPABASE_URL`), a chave `anon` (`SUPABASE_ANON_KEY`) e a
   `service_role` (`SUPABASE_SERVICE_ROLE_KEY`, **segredo**, só no Render).
3. **Settings → API → JWT Keys**: prefira chaves **assimétricas** (a API valida pelo JWKS público). Só use
   `SUPABASE_JWT_SECRET` se o projeto for de chave simétrica (legado).
4. **Connect** (string de conexão do Postgres). Use o **Session pooler** (porta 5432), que funciona em IPv4:
   - `DATABASE_URL` e `DIRECT_URL`: a mesma string do _Session pooler_ (`…pooler.supabase.com:5432`).
   - A conexão "direta" do Supabase pode exigir IPv6; confirme no painel se o Render consegue alcançá-la.
   - Coloque `DATABASE_POOL_MAX=5` para não estourar o limite de conexões do plano gratuito.
5. **Authentication → Providers → Email**: ligue "Confirm email" e defina senha mínima de 8 caracteres.
   O e-mail padrão do Supabase tem limite baixo de envios; para a banca, configure um SMTP próprio ou
   desligue a confirmação só durante a demonstração.
6. **Authentication → URL Configuration**: `Site URL` = URL do Cloudflare Pages. Em _Redirect URLs_ adicione
   `https://SEU-SITE/onboarding` e `https://SEU-SITE/redefinir-senha`.
7. **SQL Editor**: rode [`docs/supabase-setup.sql`](supabase-setup.sql) (cria o bucket `avatars`).

As tabelas são criadas pelo Prisma no deploy da API (passo 2). Não crie tabelas à mão.

## 2. Render (API)

Opção A, **Blueprint**: _New → Blueprint_ e aponte para o repositório; o [`render.yaml`](../render.yaml) já traz
build, start e health check. Preencha as variáveis marcadas `sync: false`.

Opção B, manual: _New → Web Service_, runtime Node, e:

| Campo                   | Valor                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build Command           | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build:shared && pnpm --filter @know-know/api build && pnpm --filter @know-know/api prisma:deploy` |
| Start Command           | `node apps/api/dist/main.js`                                                                                                                                              |
| Health Check Path       | `/health`                                                                                                                                                                 |
| Variável `NODE_VERSION` | `22`                                                                                                                                                                      |

Variáveis de ambiente (todas em `apps/api/.env.example`):

| Variável                                                         | Valor                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| `NODE_ENV`                                                       | `production`                                            |
| `FRONTEND_URL`                                                   | URL do Cloudflare Pages, sem barra final                |
| `CORS_ALLOWED_ORIGINS`                                           | a mesma URL (várias separadas por vírgula; **sem** `*`) |
| `DATABASE_URL`, `DIRECT_URL`                                     | strings do passo 1.4                                    |
| `DATABASE_POOL_MAX`                                              | `5`                                                     |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | do passo 1.2                                            |
| `CREDITS_PER_HOUR`, `WELCOME_BONUS_CREDITS`                      | `10` e `20` (ajuste à vontade)                          |

A API lê `PORT` do ambiente e expõe `GET /health` → `{ "status": "ok" }`. A documentação Swagger fica em `/docs`.

⚠️ O plano gratuito do Render **dorme** após alguns minutos sem uso e a primeira requisição leva cerca de 1 minuto.
Antes de apresentar, abra `/health` para acordar a API.

## 3. Cloudflare Pages (site)

_Workers & Pages → Create → Pages → Connect to Git_, e:

| Campo                   | Valor                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Framework preset        | nenhum                                                                                                         |
| Build command           | `corepack enable && pnpm install --frozen-lockfile && pnpm build:shared && pnpm --filter @know-know/web build` |
| Build output directory  | `apps/web/dist`                                                                                                |
| Variável `NODE_VERSION` | `22`                                                                                                           |

Variáveis de ambiente do build (**públicas**; nunca coloque segredos aqui):

| Variável                 | Valor                                                                             |
| ------------------------ | --------------------------------------------------------------------------------- |
| `VITE_API_URL`           | URL da API no Render, sem barra final (ex.: `https://know-know-api.onrender.com`) |
| `VITE_SUPABASE_URL`      | `Project URL`                                                                     |
| `VITE_SUPABASE_ANON_KEY` | chave `anon`                                                                      |
| `VITE_SITE_URL`          | URL do site (deixa o `og:image` absoluto)                                         |

O arquivo `apps/web/public/_redirects` faz o _fallback_ de SPA (rotas como `/aulas/123` funcionam ao recarregar) e
`_headers` aplica os cabeçalhos de segurança básicos.

### CSP recomendada (opcional)

Como o `_headers` é estático, acrescente (trocando pelos seus domínios) para endurecer o site:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://SEU-PROJETO.supabase.co; font-src 'self'; connect-src 'self' https://SUA-API.onrender.com https://SEU-PROJETO.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

## 4. Dados de demonstração

Na sua máquina, apontando para o banco de produção **só se for intencional**:

```bash
# apps/api/.env com DATABASE_URL/DIRECT_URL do Supabase e SUPABASE_SERVICE_ROLE_KEY
ALLOW_PRODUCTION_SEED=true SEED_DEMO_PASSWORD='uma-senha-forte' pnpm db:seed
```

O seed cria as contas no Supabase Auth (com e-mail já confirmado) e os perfis fictícios. Use `-- --reset` para
recriar tudo (**apaga todos os dados**).

## Checklist pós-deploy

- [ ] `https://SUA-API/health` → `{"status":"ok"}` e `https://SUA-API/health/ready` → banco ok.
- [ ] `https://SUA-API/docs` abre o Swagger.
- [ ] O site abre, `/explorar` lista pessoas (a API respondeu) e a taxa de créditos aparece na landing.
- [ ] Cadastro cria o perfil com 20 créditos; login e logout funcionam.
- [ ] Solicitar aula → aceitar → concluir (veja o [roteiro](roteiro-da-banca.md)).
- [ ] Trocar a foto de perfil funciona (bucket `avatars`).
- [ ] CORS: abrir o site de outra origem **não** consegue chamar a API.
- [ ] A `service_role` não aparece em nenhum arquivo do site (`apps/web/dist`).
