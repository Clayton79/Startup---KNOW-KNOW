# Roadmap e modelo de negócio

O MVP foi mantido propositalmente enxuto. Estes itens estão **fora** do MVP e devem entrar em fases
futuras, sem misturar com o código atual.

## Próximas versões

| Item                            | Ideia                                                               | O que já está preparado                                     |
| ------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Chat**                        | Conversa entre aluno e mentor antes/depois da aula                  | `notifications` e `sessions` já amarram as duas pessoas     |
| **Videoconferência própria**    | Sala dentro da plataforma                                           | `meeting_provider` e `meeting_url` por aula                 |
| **App mobile**                  | PWA primeiro (manifest já existe), depois nativo                    | Front responsivo e API REST documentada                     |
| **Compra de créditos**          | Pagamento real (Pix/cartão)                                         | Ledger com `ADMIN_ADJUSTMENT`/`BONUS`; novo tipo `PURCHASE` |
| **Plano Premium**               | Destaque no Explorar, mais solicitações simultâneas                 | Limites centralizados em `SESSION_RULES`                    |
| **Certificação de habilidades** | Selo por avaliação consistente ou teste                             | Reputação por habilidade pode derivar de `reviews`          |
| **Recomendações avançadas**     | Sinais de comportamento, aprendizagem de pesos                      | `matching/scoring.ts` isolado e coberto por testes          |
| **IA no matching**              | Só onde regra simples não resolve (ex.: entender descrições livres) | Mesma interface `scoreMatch`                                |
| **Badges**                      | Conquistas leves (primeira aula, 10 aulas…)                         | Contadores já existem em `profiles`                         |
| **Comunidades**                 | Grupos por tema                                                     | `skill_categories`                                          |
| **Lembretes por e-mail**        | Aula próxima, pedidos pendentes                                     | Notificações já têm tipo e destinatário                     |
| **Exportação de dados (LGPD)**  | Download do que a plataforma sabe sobre a pessoa                    | Dados todos relacionais                                     |
| **Job agendado**                | Expirar solicitações e criar lembretes sem depender de acesso       | Hoje feito "sob demanda" (plano gratuito dorme)             |

## Modelo de negócio

**B2C (hoje):** pessoas físicas trocam conhecimento. Receita futura possível: créditos comprados,
plano Premium.

**B2B2C: KNOW-KNOW Campus.** Universidades e organizações contratam a plataforma para seus alunos
e membros, que passam a ajudar uns aos outros dentro de uma **comunidade privada**.

Para suportar isso sem reescrever tudo, a evolução prevista é:

1. Tabela `organizations` e `memberships` (pessoa ↔ organização, com papel).
2. Coluna `organization_id` em `profiles`, `sessions`, `wallets` (créditos por organização, se a
   instituição quiser uma economia fechada).
3. Filtros do Explorar e do match limitados à organização; domínio de e-mail institucional para
   entrada automática.
4. Painel da organização (admin local) com métricas: horas de mentoria, habilidades mais
   procuradas, engajamento.
5. Políticas de RLS/escopo por organização (multi-tenancy **lógica**, no mesmo banco).

Nada disso foi implementado no MVP de propósito: o escopo atual já demonstra o diferencial central.
