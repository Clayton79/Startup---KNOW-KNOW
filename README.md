# KNOW-KNOW · Troca de conhecimento que transforma

> **Ensine o que você sabe para aprender aquilo que você quer.**

KNOW-KNOW é uma plataforma onde pessoas ensinam o que sabem, ganham **créditos** e usam esses créditos para
aprender com outras pessoas. A troca **não precisa ser direta**: o João ensina Java ao Lucas, ganha créditos e
os usa para ter aula de inglês com a Maria.

Projeto de TCC (ADS), desenvolvido como um MVP real: full-stack funcional, seguro, responsivo, acessível e
preparado para deploy gratuito.

<p align="center"><img src="docs/logo-original.jpg" alt="Logo da KNOW-KNOW" width="220" /></p>

## O que já funciona

- **Conta e perfil**: cadastro, login, recuperação de senha, onboarding em 5 passos, foto, bio, fuso horário.
- **Conhecimentos**: catálogo por categoria; o que você ensina (com nível e descrição) e o que quer aprender.
- **Explorar**: busca e filtros (conhecimento, nível, avaliação, online/presencial, disponibilidade).
- **Match**: pontuação 0–100 explicável ("Vocês podem aprender um com o outro"); troca direta **não** é obrigatória.
- **Aulas**: pedido → aceitar / recusar / sugerir outro horário → confirmação dos dois → concluída.
  Horários livres calculados no fuso do mentor; conflitos de agenda barrados pelo banco.
- **Créditos**: carteira, reserva (escrow) ao pedir, **ledger imutável**, liquidação única e idempotente.
- **Avaliações e reputação**: só quem fez a aula avalia; exibida como "4,8 · 27 avaliações".
- **Notificações**, **denúncias**, **painel de administração**, **exclusão de conta** (LGPD).
- Landing, "Como funciona", Termos e Privacidade.

Veja as regras em detalhe em [`docs/regras-de-negocio.md`](docs/regras-de-negocio.md).

## Stack

| Camada    | Tecnologias                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod, Radix UI |
| Backend   | Node.js, NestJS 11, TypeScript, Prisma 7, PostgreSQL, Swagger/OpenAPI, Zod                                |
| Infra     | Supabase (Postgres, Auth, Storage), Render (API), Cloudflare Pages (site), GitHub Actions                 |
| Qualidade | ESLint, Prettier, Vitest, React Testing Library, Jest, Supertest, Playwright, axe                         |

## Estrutura

```
apps/api         API NestJS (módulos por domínio) + schema/migrations/seed do Prisma
apps/web         Site React (features por domínio)
packages/shared  Enums, schemas Zod e contratos compartilhados
docs/            Arquitetura, regras, segurança, deploy, roteiro da banca, roadmap
```

Detalhes e diagramas em [`docs/arquitetura.md`](docs/arquitetura.md).

## Rodando localmente

Pré-requisitos: **Node 20.19+** (recomendado 22), **pnpm 12** (`corepack enable`) e um **PostgreSQL**
(ou `docker compose up -d`, que sobe um na porta 54329 com os bancos de teste).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # preencha DATABASE_URL e SUPABASE_* (veja abaixo)
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate                             # cria as tabelas
pnpm db:seed                                # catálogo + perfis fictícios de demonstração
```

O **login** usa o Supabase Auth. Há duas formas de rodar:

### A) Sem Supabase (o jeito mais rápido de testar)

`pnpm dev:auth` sobe um **login local de desenvolvimento** (`scripts/dev-auth-server.mjs`), um substituto
mínimo do Supabase Auth que só serve para isso: escuta apenas em `127.0.0.1` e recusa rodar em produção.

Em `apps/api/.env`: `SUPABASE_URL=http://localhost:54321`, `SUPABASE_ANON_KEY=local-anon-key`,
`SUPABASE_SERVICE_ROLE_KEY=local-service-role-key` e um `SUPABASE_JWT_SECRET` com 32+ caracteres.
Em `apps/web/.env.local`: `VITE_SUPABASE_URL=http://localhost:54321` e `VITE_SUPABASE_ANON_KEY=local-anon-key`.

```bash
pnpm dev:auth    # login local        http://localhost:54321
pnpm dev:api     # API                http://localhost:3000   (Swagger em /docs)
pnpm dev:web     # site               http://localhost:5173
```

(um terminal para cada; a API leva ~1 min na primeira partida). Entre com os perfis de demonstração, todos
com a senha `demo-senha-123`: `ana@demo.know-know.app`, `lucas@…`, `marina@…`, `rafael@…`, e
`admin@demo.know-know.app` (painel de administração). Cadastros novos também funcionam.

Limites do modo local: não há Storage (o **envio de foto de perfil não funciona**) e não há e-mail: o link de
"esqueci minha senha" aparece no terminal do `pnpm dev:auth` (e em `.local/dev-auth-recovery-link.txt`).

### B) Com um projeto Supabase real

Crie um projeto gratuito, coloque as chaves em `apps/api/.env` e `apps/web/.env.local` (não rode `dev:auth`) e,
para os perfis de demonstração conseguirem logar:

```bash
SEED_DEMO_PASSWORD='uma-senha-forte' pnpm db:seed -- --reset
```

## Variáveis de ambiente

Todas documentadas em [`apps/api/.env.example`](apps/api/.env.example) e [`apps/web/.env.example`](apps/web/.env.example).

| Onde | Variável                                                      | Observação                                  |
| ---- | ------------------------------------------------------------- | ------------------------------------------- |
| API  | `DATABASE_URL`, `DIRECT_URL`                                  | Postgres (pooler / conexão para migrations) |
| API  | `SUPABASE_URL`, `SUPABASE_ANON_KEY`                           | públicas                                    |
| API  | `SUPABASE_SERVICE_ROLE_KEY`                                   | **segredo**, só no servidor                 |
| API  | `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`                        | CORS restritivo (sem `*` em produção)       |
| API  | `CREDITS_PER_HOUR`, `WELCOME_BONUS_CREDITS`                   | regras de negócio configuráveis             |
| Web  | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` | públicas (vão para o navegador)             |

## Comandos

| Comando                            | O que faz                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm format`        | ESLint / Prettier                                                                  |
| `pnpm typecheck`                   | TypeScript estrito em todos os pacotes                                             |
| `pnpm test`                        | testes unitários e de integração (API contra Postgres real, web com Vitest)        |
| `pnpm e2e`                         | build + Playwright: fluxo completo da banca, responsividade e acessibilidade (axe) |
| `pnpm build`                       | build de produção de tudo                                                          |
| `pnpm check:contrast`              | valida os pares de cor do design system (WCAG AA)                                  |
| `pnpm db:migrate` · `pnpm db:seed` | migrations / dados de demonstração                                                 |

Antes de publicar, o pipeline é: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` (o CI faz o mesmo e roda o e2e).

## Banco de dados

Schema em [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma). Regras que o Prisma não expressa
(CHECKs, exclusão de horários sobrepostos, ledger imutável, review só de aula concluída, RLS) ficam em
`apps/api/prisma/migrations/*_database_rules/`.

## Testes

- **API** (~200 testes): regras de negócio e **integração contra um Postgres real**, incluindo concorrência
  (créditos, horários, confirmações), autorização, token adulterado e ledger imutável.
- **Web**: componentes e utilidades (Vitest + Testing Library).
- **E2E** (Playwright): o fluxo da banca no navegador, no desktop e no celular, com checagem de acessibilidade.
  O Supabase Auth é **simulado** nos testes; API, banco e interface são reais.

## Deploy

Passo a passo em [`docs/deploy.md`](docs/deploy.md) (Supabase + Render + Cloudflare Pages, plano gratuito).

## Documentação

| Documento                                                | Conteúdo                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| [`docs/arquitetura.md`](docs/arquitetura.md)             | Visão geral, módulos, fluxos, modelo de dados, decisões e limites |
| [`docs/regras-de-negocio.md`](docs/regras-de-negocio.md) | Cada regra, onde é garantida e qual teste a cobre                 |
| [`docs/seguranca.md`](docs/seguranca.md)                 | OWASP, o que está coberto e o que **não** está                    |
| [`docs/deploy.md`](docs/deploy.md)                       | Publicação gratuita e checklist                                   |
| [`docs/roteiro-da-banca.md`](docs/roteiro-da-banca.md)   | Roteiro da demonstração                                           |
| [`docs/roadmap.md`](docs/roadmap.md)                     | Futuro, incluindo o KNOW-KNOW Campus (B2B2C)                      |

## Identidade visual

Os design tokens (`apps/web/src/styles/tokens.css`) foram derivados da logo: azul-marinho `#122F69`
(fundo da logo) e creme `#F4EEDE` (letras e ícone), com um azul de ação do mesmo matiz. Os pares de cor
são validados contra WCAG 2.2 AA por `pnpm check:contrast`. As imagens de marca em
`apps/web/public/brand/` são recortes da logo original, sem alterações.

## Aviso

Perfis, avaliações e aulas do seed são **fictícios** e identificados como demonstração. Os Termos e a
Política de Privacidade são modelos acadêmicos e precisam de revisão jurídica antes de uso comercial.
