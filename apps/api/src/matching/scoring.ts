import {
  SKILL_LEVEL_ORDER,
  type MatchLabel,
  type MatchView,
  type PreferredMode,
  type SkillLevel,
} from '@know-know/shared';

/**
 * Pontuação de compatibilidade entre duas pessoas (0–100). Regras determinísticas, sem IA:
 * fáceis de explicar, testar e evoluir. Os pesos ficam todos aqui.
 */
export const MATCH_WEIGHTS = {
  /** O candidato ensina algo que eu quero aprender. */
  wantsFromCandidate: 40,
  /** O candidato quer aprender algo que eu ensino (troca mútua). */
  reciprocity: 25,
  /** Horários semanais se cruzam. */
  availability: 15,
  /** Modalidade (online/presencial) compatível. */
  mode: 10,
  /** Reputação (média ponderada pela quantidade de avaliações). */
  reputation: 10,
} as const;

/** Minutos de sobreposição semanal que já dão a pontuação máxima de disponibilidade. */
const FULL_OVERLAP_MINUTES = 180;

/** Média "a priori": evita que uma única avaliação 5★ vença 27 avaliações de 4,8. */
const RATING_PRIOR_MEAN = 4;
const RATING_PRIOR_WEIGHT = 3;

const LABEL_THRESHOLDS: { min: number; label: MatchLabel }[] = [
  { min: 80, label: 'EXCELLENT' },
  { min: 60, label: 'GOOD' },
  { min: 40, label: 'POSSIBLE' },
];

const WEEK_MINUTES = 7 * 24 * 60;

export interface AvailabilityRuleLite {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface MatchParty {
  teaching: { skillId: string; level: SkillLevel }[];
  learning: { skillId: string; desiredLevel: SkillLevel | null }[];
  preferredMode: PreferredMode;
  city: string | null;
  availability: AvailabilityRuleLite[];
  /** Deslocamento do fuso em relação ao UTC, em minutos (ex.: -180 para São Paulo). */
  utcOffsetMinutes: number;
}

export interface CandidateParty extends MatchParty {
  mentorRatingSum: number;
  mentorRatingCount: number;
}

/** Média de avaliações ponderada pela quantidade de avaliações (média bayesiana). */
export function bayesianAverage(sum: number, count: number): number {
  return (sum + RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN) / (count + RATING_PRIOR_WEIGHT);
}

function normalizeCity(city: string | null): string | null {
  if (!city) return null;
  const normalized = city.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return normalized === '' ? null : normalized;
}

/** Converte regras semanais (horário local) em intervalos na semana UTC, tratando a virada da semana. */
export function toUtcWeekIntervals(
  rules: AvailabilityRuleLite[],
  utcOffsetMinutes: number,
): [number, number][] {
  const intervals: [number, number][] = [];
  for (const rule of rules) {
    let start = rule.weekday * 1440 + rule.startMinute - utcOffsetMinutes;
    let end = rule.weekday * 1440 + rule.endMinute - utcOffsetMinutes;
    const shift = Math.floor(start / WEEK_MINUTES) * WEEK_MINUTES;
    start -= shift;
    end -= shift;
    if (end > WEEK_MINUTES) {
      intervals.push([start, WEEK_MINUTES], [0, end - WEEK_MINUTES]);
    } else {
      intervals.push([start, end]);
    }
  }
  return intervals;
}

/** Total de minutos por semana em que os dois estão disponíveis ao mesmo tempo. */
export function overlapMinutes(a: MatchParty, b: MatchParty): number {
  const first = toUtcWeekIntervals(a.availability, a.utcOffsetMinutes);
  const second = toUtcWeekIntervals(b.availability, b.utcOffsetMinutes);
  let total = 0;
  for (const [s1, e1] of first) {
    for (const [s2, e2] of second) {
      total += Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));
    }
  }
  return total;
}

function modeScore(
  viewer: MatchParty,
  candidate: MatchParty,
): { points: number; reason: string | null } {
  const viewerOnline = viewer.preferredMode !== 'IN_PERSON';
  const candidateOnline = candidate.preferredMode !== 'IN_PERSON';
  if (viewerOnline && candidateOnline) {
    return { points: MATCH_WEIGHTS.mode, reason: 'Os dois topam aula online' };
  }

  const viewerInPerson = viewer.preferredMode !== 'ONLINE';
  const candidateInPerson = candidate.preferredMode !== 'ONLINE';
  const viewerCity = normalizeCity(viewer.city);
  if (
    viewerInPerson &&
    candidateInPerson &&
    viewerCity &&
    viewerCity === normalizeCity(candidate.city)
  ) {
    return {
      points: MATCH_WEIGHTS.mode,
      reason: 'Vocês estão na mesma cidade para aulas presenciais',
    };
  }
  return { points: 0, reason: null };
}

export interface ScoreInput {
  viewer: MatchParty;
  candidate: CandidateParty;
  /** A habilidade do candidato que está sendo avaliada (a do card). */
  focusSkillId: string;
}

/** Calcula a pontuação e explica o resultado em linguagem simples. */
export function scoreMatch({ viewer, candidate, focusSkillId }: ScoreInput): MatchView {
  const reasons: string[] = [];
  let score = 0;

  // 1) O candidato ensina o que eu quero aprender.
  const wanted = viewer.learning.find((item) => item.skillId === focusSkillId);
  const focus = candidate.teaching.find((item) => item.skillId === focusSkillId);
  const otherWanted = viewer.learning.some((item) =>
    candidate.teaching.some((teach) => teach.skillId === item.skillId),
  );
  let wantsPoints = 0;
  if (wanted && focus) {
    const meetsLevel =
      !wanted.desiredLevel ||
      SKILL_LEVEL_ORDER[focus.level] >= SKILL_LEVEL_ORDER[wanted.desiredLevel];
    wantsPoints = meetsLevel
      ? MATCH_WEIGHTS.wantsFromCandidate
      : Math.round(MATCH_WEIGHTS.wantsFromCandidate * 0.6);
    reasons.push(
      meetsLevel
        ? 'Ensina o que você quer aprender'
        : 'Ensina o que você quer, em nível um pouco abaixo do desejado',
    );
  } else if (otherWanted) {
    wantsPoints = Math.round(MATCH_WEIGHTS.wantsFromCandidate * 0.5);
    reasons.push('Também ensina outras coisas que você quer aprender');
  }
  score += wantsPoints;

  // 2) Eu ensino o que o candidato quer aprender (troca mútua).
  const iTeachWhatTheyWant = candidate.learning.some((item) =>
    viewer.teaching.some((teach) => teach.skillId === item.skillId),
  );
  if (iTeachWhatTheyWant) {
    score += MATCH_WEIGHTS.reciprocity;
    reasons.push('Quer aprender algo que você sabe ensinar');
  }

  // 3) Disponibilidade em comum.
  const overlap = overlapMinutes(viewer, candidate);
  if (overlap > 0) {
    score += Math.round(MATCH_WEIGHTS.availability * Math.min(overlap / FULL_OVERLAP_MINUTES, 1));
    reasons.push('Horários que combinam com os seus');
  }

  // 4) Modalidade.
  const mode = modeScore(viewer, candidate);
  score += mode.points;
  if (mode.reason) reasons.push(mode.reason);

  // 5) Reputação.
  const bayes = bayesianAverage(candidate.mentorRatingSum, candidate.mentorRatingCount);
  score += Math.round(((bayes - 1) / 4) * MATCH_WEIGHTS.reputation);
  if (candidate.mentorRatingCount >= 3 && bayes >= 4.5) reasons.push('Muito bem avaliado');

  score = Math.max(0, Math.min(100, score));
  const mutual = wantsPoints > 0 && iTeachWhatTheyWant;
  const label = LABEL_THRESHOLDS.find((entry) => score >= entry.min)?.label ?? null;

  let headline: string | null = null;
  if (mutual && label) headline = 'Vocês podem aprender um com o outro.';
  else if (wantsPoints > 0 && label) headline = 'Pode te ensinar o que você procura.';

  return { score, label, mutual, headline, reasons };
}
