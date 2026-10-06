-- Regras de integridade que o Prisma não expressa. O backend também valida tudo isso;
-- aqui o banco garante mesmo sob concorrência ou bug na aplicação.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ───────────── Disponibilidade ─────────────
ALTER TABLE "availability_rules"
  ADD CONSTRAINT "availability_rules_range_chk"
  CHECK ("weekday" BETWEEN 0 AND 6 AND "start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute");

-- ───────────── Aulas ─────────────
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_not_self_chk" CHECK ("mentor_id" <> "student_id"),
  ADD CONSTRAINT "sessions_time_chk" CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "sessions_duration_chk" CHECK ("duration_minutes" IN (30, 60, 90, 120)),
  ADD CONSTRAINT "sessions_cost_chk" CHECK ("credit_cost" >= 0),
  ADD CONSTRAINT "sessions_proposer_chk" CHECK ("last_proposed_by_id" IN ("mentor_id", "student_id")),
  ADD CONSTRAINT "sessions_settled_chk" CHECK ("settled_at" IS NULL OR "status" = 'COMPLETED');

-- Um mentor (ou aluno) não pode ter duas aulas confirmadas sobrepostas.
-- Solicitações PENDING podem coexistir; o conflito é barrado no aceite.
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_mentor_no_overlap"
  EXCLUDE USING gist ("mentor_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION'));

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_student_no_overlap"
  EXCLUDE USING gist ("student_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION'));

-- ───────────── Créditos ─────────────
ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_balance_chk" CHECK ("balance" >= 0),
  ADD CONSTRAINT "wallets_held_chk" CHECK ("held" >= 0 AND "held" <= "balance");

ALTER TABLE "credit_transactions"
  ADD CONSTRAINT "credit_transactions_amount_chk" CHECK ("amount" <> 0),
  ADD CONSTRAINT "credit_transactions_balance_after_chk" CHECK ("balance_after" >= 0),
  ADD CONSTRAINT "credit_transactions_sign_chk" CHECK (
    ("type" IN ('EARNED_CLASS', 'BONUS', 'REFUND') AND "amount" > 0)
    OR ("type" = 'SPENT_CLASS' AND "amount" < 0)
    OR "type" = 'ADMIN_ADJUSTMENT'
  );

-- Ledger imutável: nenhuma transação pode ser alterada ou apagada.
CREATE FUNCTION "credit_transactions_immutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'credit_transactions é imutável (% bloqueado)', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "credit_transactions_no_update_delete"
  BEFORE UPDATE OR DELETE ON "credit_transactions"
  FOR EACH ROW EXECUTE FUNCTION "credit_transactions_immutable"();

-- ───────────── Avaliações ─────────────
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_chk" CHECK ("rating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "reviews_not_self_chk" CHECK ("author_id" <> "target_id");

ALTER TABLE "review_scores"
  ADD CONSTRAINT "review_scores_score_chk" CHECK ("score" BETWEEN 1 AND 5);

-- Só participantes de uma aula COMPLETED podem avaliar, e apenas o outro participante.
CREATE FUNCTION "reviews_validate"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  s_status "SessionStatus";
  s_mentor uuid;
  s_student uuid;
BEGIN
  SELECT "status", "mentor_id", "student_id" INTO s_status, s_mentor, s_student
  FROM "sessions" WHERE "id" = NEW."session_id";

  IF s_status IS DISTINCT FROM 'COMPLETED' THEN
    RAISE EXCEPTION 'Só é possível avaliar aulas concluídas' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."direction" = 'STUDENT_TO_MENTOR'
     AND NOT (NEW."author_id" = s_student AND NEW."target_id" = s_mentor) THEN
    RAISE EXCEPTION 'Avaliação fora dos participantes da aula' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."direction" = 'MENTOR_TO_STUDENT'
     AND NOT (NEW."author_id" = s_mentor AND NEW."target_id" = s_student) THEN
    RAISE EXCEPTION 'Avaliação fora dos participantes da aula' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "reviews_validate_insert"
  BEFORE INSERT ON "reviews"
  FOR EACH ROW EXECUTE FUNCTION "reviews_validate"();

-- ───────────── Denúncias e perfis ─────────────
ALTER TABLE "reports"
  ADD CONSTRAINT "reports_not_self_chk" CHECK ("reporter_id" <> "target_user_id");

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_counters_chk" CHECK (
    "mentor_rating_sum" >= 0 AND "mentor_rating_count" >= 0
    AND "student_rating_sum" >= 0 AND "student_rating_count" >= 0
    AND "sessions_taught" >= 0 AND "sessions_learned" >= 0
  );

-- ───────────── Row Level Security ─────────────
-- A API acessa o banco com credencial de servidor (ignora RLS). Habilitar RLS sem políticas
-- bloqueia qualquer acesso direto pela API REST pública do Supabase com a chave anon.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_teaching_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_learning_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "availability_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "review_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;

-- Tabela de controle do Prisma (não existe no banco-sombra do `migrate dev`).
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;
