# Segurança

Checklist baseado no OWASP Top 10, com o que existe de fato e o que **não** está coberto.

## O que está implementado

| Risco                           | Medida                                                                                                                                                                                                                          | Onde                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **A01 Controle de acesso**      | Guard global; papel e status lidos do banco; toda operação confere propriedade (ex.: aula só para participantes, 404 para terceiros); rotas `/admin` exigem `ADMIN`                                                             | `auth/`, `sessions/`, testes `*.e2e-spec.ts` |
| **A01 Mass assignment**         | Schemas Zod `strict()`: `role`, `status` e contadores não podem ser enviados pelo cliente                                                                                                                                       | `profile.e2e-spec.ts`                        |
| **A02 Criptografia**            | HTTPS nos provedores; senhas só no Supabase Auth; HSTS via Helmet; JWT validado (assinatura, emissor, audiência, expiração)                                                                                                     | `jwt-verifier.service.ts`                    |
| **A03 Injeção**                 | Prisma/consultas parametrizadas, nenhum SQL concatenado; `$queryRaw` só com _tagged templates_; busca tratada como texto                                                                                                        | `explore.e2e-spec.ts`                        |
| **A04 Design inseguro**         | Regras críticas também no banco (exclusão de horários, ledger imutável, CHECKs); escrow de créditos; idempotência                                                                                                               | `*_database_rules`                           |
| **A05 Configuração**            | Helmet, CORS por lista (sem `*` em produção), `x-powered-by` removido, limite de corpo de 100 kB, ambiente validado na subida, `THROTTLE_DISABLED` proibido em produção                                                         | `app.setup.ts`, `env.ts`                     |
| **A06 Componentes vulneráveis** | Lockfile; política de idade mínima de releases do pnpm; scripts de build de dependências em lista de permissão; `pnpm audit --prod` sem vulnerabilidades (com `overrides` para três dependências transitivas do Prisma/Swagger) | `pnpm-workspace.yaml`                        |
| **A07 Autenticação**            | Supabase Auth; algoritmos de JWT fixos (sem `alg: none`); mensagens de erro de login genéricas; rate limit                                                                                                                      | `auth.e2e-spec.ts`                           |
| **A08 Integridade**             | Liquidação única (`settled_at`), ledger imutável, `FOR UPDATE` nas mudanças de estado                                                                                                                                           | `credits.e2e-spec.ts`                        |
| **A09 Logs**                    | Falhas 5xx logadas no servidor; nada sensível é logado; stack trace nunca vai ao cliente                                                                                                                                        | `all-exceptions.filter.ts`                   |
| **A10 SSRF**                    | A API só chama a URL fixa do Supabase; links de reunião são só armazenados (https) e nunca buscados pelo servidor                                                                                                               | `meetingUrlSchema`                           |

Mais:

- **Rate limit** global (por IP) e mais restritivo em escrita sensível (`POST /sessions`, confirmações, denúncias, avaliações).
- **Paginação** obrigatória e limitada (máx. 50) em listas.
- **Upload**: só por URL assinada na pasta do próprio usuário; tipos JPG/PNG/WebP e 2 MB reforçados no
  bucket (`docs/supabase-setup.sql`).
- **RLS** ligado em todas as tabelas, sem políticas: a chave pública (`anon`) não lê nada pelo REST do Supabase.
- **Links de aula** privados: só os dois participantes, só após o aceite, só `https://`, abertos com `rel="noopener noreferrer"`.
- **Redirecionamento pós-login** só para caminhos internos.

## O que NÃO está coberto (seja transparente na banca)

- A integração com o **Supabase Auth real** não foi exercitada nos testes automatizados: eles usam tokens
  HS256 assinados com um segredo de teste e um Supabase Auth simulado no navegador. A verificação por
  **JWKS** (chaves assimétricas) existe no código, mas precisa ser validada no seu projeto Supabase.
- Sem **CSP** no site estático (veja a sugestão em `docs/deploy.md`) e sem escaneamento de conteúdo de imagens enviadas.
- **Rate limit em memória**: por instância.
- Sem **2FA**, sem verificação de identidade e sem moderação automática de texto.
- Nenhum **teste de penetração** foi feito.
- Os textos de **Termos** e **Privacidade** são modelos acadêmicos e precisam de revisão jurídica antes de uso comercial.

## Checklist antes de publicar

- [ ] `SUPABASE_SERVICE_ROLE_KEY` só no Render (nunca em `VITE_*`).
- [ ] Chaves de assinatura do Supabase **assimétricas**; `SUPABASE_JWT_SECRET` vazio.
- [ ] Confirmação de e-mail ligada e política de senha ≥ 8 no Supabase Auth.
- [ ] `CORS_ALLOWED_ORIGINS` com a URL exata do site.
- [ ] URLs de redirecionamento do Supabase limitadas ao seu domínio.
- [ ] `pnpm audit` sem vulnerabilidades altas/críticas.
- [ ] Nenhum `.env` no repositório (`git log -p -- '*.env*'`).
