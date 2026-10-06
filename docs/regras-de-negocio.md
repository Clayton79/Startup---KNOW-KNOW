# Regras de negócio

Cada regra importante vive no backend e, sempre que possível, também é garantida pelo banco.
A coluna **Teste** aponta onde ela é verificada automaticamente.

## Créditos

| Regra                                                                                                                                                      | Onde é garantida                                                                                            | Teste                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1 hora de aula = **10 créditos** (configurável, nunca fixo no código)                                                                                      | `CREDITS_PER_HOUR` → `AppConfig.creditCostFor`                                                              | `credits.spec.ts`                             |
| Custo proporcional: 30 min = 5, 60 = 10, 90 = 15, 120 = 20                                                                                                 | `AppConfig` + CHECK `sessions_duration_chk`                                                                 | `credits.spec.ts`, `sessions.e2e-spec.ts`     |
| Quem se cadastra ganha créditos de boas-vindas (20), uma única vez                                                                                         | `ProfilesService.provision` (transação)                                                                     | `auth.e2e-spec.ts`                            |
| Saldo **nunca negativo**                                                                                                                                   | `UPDATE … WHERE balance - held >= valor` atômico + CHECK `wallets_balance_chk`                              | `credits.e2e-spec.ts`                         |
| O reservado nunca passa do saldo                                                                                                                           | CHECK `wallets_held_chk`                                                                                    | `credits.e2e-spec.ts`                         |
| Ao **solicitar**, os créditos do aluno ficam **reservados** (escrow). Não dá para pedir mais aulas do que o saldo permite, nem com requisições simultâneas | `LedgerService.hold`                                                                                        | `sessions.e2e-spec.ts`                        |
| Reserva liberada se a aula for recusada, cancelada, expirar, "não aconteceu" ou cancelada pelo admin                                                       | `LedgerService.release`                                                                                     | `sessions.e2e-spec.ts`, `credits.e2e-spec.ts` |
| Créditos só passam ao mentor quando **os dois confirmam** que a aula aconteceu                                                                             | `SessionsService.confirm` → `settleAndComplete`                                                             | `credits.e2e-spec.ts`                         |
| Liquidação **única e idempotente**: repetir a requisição não paga duas vezes                                                                               | `UPDATE sessions … WHERE settled_at IS NULL` + unique `(session_id, user_id, type)` + `SELECT … FOR UPDATE` | `credits.e2e-spec.ts`                         |
| O saldo é **materializado** em `wallets` e o **ledger** registra cada movimento; a soma do ledger sempre bate com o saldo                                  | mesma transação grava os dois                                                                               | `credits.e2e-spec.ts`                         |
| O ledger é **imutável** (sem `UPDATE`/`DELETE`)                                                                                                            | trigger `credit_transactions_immutable`                                                                     | `credits.e2e-spec.ts`                         |
| Não existe endpoint para editar saldo; o único caminho manual é o ajuste do admin, auditado no ledger com o id de quem fez                                 | `AdminService.adjustCredits`                                                                                | `credits.e2e-spec.ts`                         |
| Liquidações cruzadas simultâneas não geram deadlock                                                                                                        | carteiras atualizadas em ordem fixa de id                                                                   | `credits.e2e-spec.ts`                         |

Tipos do ledger: `EARNED_CLASS`, `SPENT_CLASS`, `BONUS`, `REFUND`, `ADMIN_ADJUSTMENT`.
O sinal do valor é validado pelo banco (entradas positivas, `SPENT_CLASS` negativo).

## Aulas

Estados: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`,
`COMPLETED`, `NO_SHOW`, `DISPUTED` (este último é uma adição para as respostas divergentes).

```
PENDING ──aceitar──────────────► ACCEPTED ──(passa o horário)──► AWAITING_CONFIRMATION
   │  ▲                             │                                  │
   │  └─ sugerir outro horário      └─ cancelar (antes de começar)     ├─ SIM + SIM ─► COMPLETED (paga)
   ├─ recusar ─► REJECTED                       │                      ├─ NÃO + NÃO ─► NO_SHOW (devolve)
   └─ cancelar ─► CANCELLED ◄───────────────────┘                      └─ SIM + NÃO ─► DISPUTED (revisão)
```

`IN_PROGRESS` e `AWAITING_CONFIRMATION` são **derivados do relógio** a partir de `ACCEPTED`: o plano
gratuito da hospedagem dorme, então não há job agendado. Eles só são gravados quando alguém age.

| Regra                                                                                                      | Onde é garantida                                                                                   | Teste                                           |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Não dá para marcar aula consigo mesmo                                                                      | CHECK `sessions_not_self_chk` + `SELF_SESSION`                                                     | `sessions.e2e-spec.ts`                          |
| O mentor precisa ensinar a habilidade pedida                                                               | `SKILL_NOT_TAUGHT`                                                                                 | `sessions.e2e-spec.ts`                          |
| O horário cabe inteiro na disponibilidade semanal do mentor, no **fuso dele**                              | `fitsAvailability` (Luxon)                                                                         | `availability-rules.spec.ts`                    |
| Antecedência mínima de 30 min e no máximo 60 dias à frente                                                 | `SESSION_RULES`                                                                                    | `sessions.e2e-spec.ts`                          |
| Dois horários **confirmados** não se sobrepõem, para o mentor nem para o aluno, **mesmo com concorrência** | constraints de exclusão `sessions_mentor_no_overlap` / `sessions_student_no_overlap` (`tstzrange`) | `sessions.e2e-spec.ts`                          |
| Solicitações pendentes podem coexistir; o conflito é barrado no aceite                                     | `assertNoScheduleConflict`                                                                         | `sessions.e2e-spec.ts`                          |
| Contraproposta: quem recebe responde; quem propôs só pode retirar                                          | `last_proposed_by_id`                                                                              | `session-state.spec.ts`                         |
| Só quem recebeu a proposta aceita ou recusa                                                                | `SessionsService.accept/reject`                                                                    | `sessions.e2e-spec.ts`                          |
| Cancelar: pedido pendente (qualquer um) ou aula aceita **antes de começar**                                | `SessionsService.cancel`                                                                           | `sessions.e2e-spec.ts`                          |
| Aula cancelada não pode ser concluída                                                                      | verificação de estado                                                                              | `sessions.e2e-spec.ts`                          |
| Confirmação só depois do fim da aula; cada pessoa responde **uma vez**                                     | `SESSION_NOT_FINISHED`, `ALREADY_CONFIRMED`                                                        | `credits.e2e-spec.ts`                           |
| Respostas divergentes → `DISPUTED`; o admin conclui (paga) ou cancela (devolve)                            | `SessionsService.resolveDispute`                                                                   | `credits.e2e-spec.ts`                           |
| Solicitação sem resposta até o horário passar **expira** e libera a reserva                                | `SessionsService.expireStale` (sob demanda)                                                        | `sessions.e2e-spec.ts`                          |
| Máximo de 10 solicitações pendentes por aluno; sem solicitação duplicada                                   | `SESSION_RULES.maxPendingPerStudent`                                                               | `sessions.e2e-spec.ts`                          |
| **Link da reunião privado**: só os dois participantes, só depois do aceite; só https                       | `meetingUrlVisible`, `meetingUrlSchema`                                                            | `sessions.e2e-spec.ts`, `session-state.spec.ts` |
| Terceiros nunca veem nem agem sobre a aula (sempre 404, sem revelar que existe)                            | `findForParticipant` / `mutate`                                                                    | `sessions.e2e-spec.ts`                          |

## Avaliações e reputação

| Regra                                                                                                                  | Onde é garantida                        | Teste                 |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------- |
| Só participantes de uma aula **COMPLETED** avaliam                                                                     | serviço + trigger `reviews_validate`    | `reviews.e2e-spec.ts` |
| Cada pessoa avalia **uma vez** por aula                                                                                | unique `(session_id, author_id)`        | `reviews.e2e-spec.ts` |
| Aluno avalia mentor (didática, conhecimento, pontualidade); mentor avalia aluno (participação, pontualidade, respeito) | `REVIEW_CATEGORIES_BY_DIRECTION`        | `reviews.e2e-spec.ts` |
| Notas de 1 a 5; comentário até 300 caracteres                                                                          | schema Zod + CHECK `reviews_rating_chk` | `reviews.e2e-spec.ts` |
| Reputação exibida como "4,8 · 27 avaliações"                                                                           | `formatReputation`                      | `format.test.ts`      |
| Ranking usa média **ponderada** (uma avaliação 5★ não vence 27 de 4,8)                                                 | `bayesianAverage`                       | `scoring.spec.ts`     |

## Match (compatibilidade)

Pontuação 0–100, determinística (`apps/api/src/matching/scoring.ts`). Troca direta **não** é obrigatória.

| Critério                                                  | Pontos |
| --------------------------------------------------------- | ------ |
| O candidato ensina o que eu quero aprender                | até 40 |
| Eu ensino o que o candidato quer aprender (reciprocidade) | 25     |
| Horários semanais se cruzam (convertidos para UTC)        | até 15 |
| Modalidade compatível (presencial exige a mesma cidade)   | 10     |
| Reputação (média ponderada)                               | até 10 |

Rótulos: ≥ 80 **Match excelente**, ≥ 60 **Bom match**, ≥ 40 **Pode combinar**.

## Perfis, privacidade e conta

| Regra                                                                                                                 | Onde é garantida                 |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Perfil público não expõe e-mail, papel, status nem dados de conta                                                     | `UsersService.getPublicProfile`  |
| Perfil só aparece depois do onboarding e se a conta estiver ativa                                                     | idem + `ExploreService`          |
| Ninguém edita o perfil de outra pessoa (não existe rota com `:id` de escrita)                                         | `ProfilesController` (`/me`)     |
| Campos como `role` não podem ser alterados pelo usuário (mass assignment)                                             | schema `strict()`                |
| Avatar só na própria pasta do Storage                                                                                 | `StorageService.isOwnAvatarPath` |
| Exclusão de conta anonimiza o perfil e cancela aulas futuras; histórico financeiro permanece sem identificar a pessoa | `AccountService`                 |
| Conta suspensa/excluída perde o acesso na hora (o status vem do banco a cada requisição)                              | `AuthGuard`                      |
