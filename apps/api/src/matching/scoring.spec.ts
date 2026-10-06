import {
  bayesianAverage,
  overlapMinutes,
  scoreMatch,
  toUtcWeekIntervals,
  type CandidateParty,
  type MatchParty,
} from './scoring';

const JAVA = 'skill-java';
const ENGLISH = 'skill-english';
const EXCEL = 'skill-excel';

const evenings: MatchParty['availability'] = [
  { weekday: 1, startMinute: 19 * 60, endMinute: 22 * 60 },
  { weekday: 3, startMinute: 18 * 60, endMinute: 21 * 60 },
];

function party(overrides: Partial<MatchParty> = {}): MatchParty {
  return {
    teaching: [],
    learning: [],
    preferredMode: 'ONLINE',
    city: null,
    availability: evenings,
    utcOffsetMinutes: -180,
    ...overrides,
  };
}

function candidate(overrides: Partial<CandidateParty> = {}): CandidateParty {
  return { ...party(), mentorRatingSum: 0, mentorRatingCount: 0, ...overrides };
}

describe('scoreMatch', () => {
  // Cenário do enunciado: Clayton ensina Java e quer inglês; Ana ensina inglês e quer Java.
  const clayton = party({
    teaching: [{ skillId: JAVA, level: 'ADVANCED' }],
    learning: [{ skillId: ENGLISH, desiredLevel: null }],
  });
  const ana = candidate({
    teaching: [{ skillId: ENGLISH, level: 'ADVANCED' }],
    learning: [{ skillId: JAVA, desiredLevel: null }],
    mentorRatingSum: 48,
    mentorRatingCount: 10,
  });

  it('troca mútua com horários e modalidade compatíveis é "match excelente"', () => {
    const result = scoreMatch({ viewer: clayton, candidate: ana, focusSkillId: ENGLISH });
    expect(result.label).toBe('EXCELLENT');
    expect(result.mutual).toBe(true);
    expect(result.headline).toBe('Vocês podem aprender um com o outro.');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons).toContain('Quer aprender algo que você sabe ensinar');
  });

  it('troca direta NÃO é obrigatória: sem reciprocidade ainda é um bom match', () => {
    const noReciprocity = candidate({
      teaching: [{ skillId: ENGLISH, level: 'ADVANCED' }],
      learning: [{ skillId: EXCEL, desiredLevel: null }],
    });
    const result = scoreMatch({ viewer: clayton, candidate: noReciprocity, focusSkillId: ENGLISH });
    expect(result.mutual).toBe(false);
    expect(result.label).toBe('GOOD');
    expect(result.headline).toBe('Pode te ensinar o que você procura.');
  });

  it('quem não ensina nada que eu quero fica sem rótulo', () => {
    const unrelated = candidate({
      teaching: [{ skillId: EXCEL, level: 'BASIC' }],
      availability: [],
      preferredMode: 'IN_PERSON',
    });
    const result = scoreMatch({ viewer: clayton, candidate: unrelated, focusSkillId: EXCEL });
    expect(result.label).toBeNull();
    expect(result.headline).toBeNull();
  });

  it('penaliza nível abaixo do desejado', () => {
    const wantsAdvanced = party({ learning: [{ skillId: ENGLISH, desiredLevel: 'ADVANCED' }] });
    const basicTeacher = candidate({ teaching: [{ skillId: ENGLISH, level: 'BASIC' }] });
    const advancedTeacher = candidate({ teaching: [{ skillId: ENGLISH, level: 'ADVANCED' }] });

    const low = scoreMatch({
      viewer: wantsAdvanced,
      candidate: basicTeacher,
      focusSkillId: ENGLISH,
    });
    const high = scoreMatch({
      viewer: wantsAdvanced,
      candidate: advancedTeacher,
      focusSkillId: ENGLISH,
    });
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('presencial só pontua modalidade na mesma cidade (ignora acento e caixa)', () => {
    const viewer = party({ preferredMode: 'IN_PERSON', city: 'São Paulo' });
    const same = candidate({ preferredMode: 'IN_PERSON', city: 'sao paulo' });
    const other = candidate({ preferredMode: 'IN_PERSON', city: 'Curitiba' });

    const a = scoreMatch({ viewer, candidate: same, focusSkillId: JAVA });
    const b = scoreMatch({ viewer, candidate: other, focusSkillId: JAVA });
    expect(a.score).toBeGreaterThan(b.score);
  });

  it('uma única avaliação 5★ não ganha de 27 avaliações de 4,8', () => {
    expect(bayesianAverage(5, 1)).toBeLessThan(bayesianAverage(4.8 * 27, 27));
  });

  it('a pontuação fica sempre entre 0 e 100', () => {
    const result = scoreMatch({ viewer: clayton, candidate: ana, focusSkillId: ENGLISH });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe('disponibilidade', () => {
  it('soma a sobreposição semanal', () => {
    const a = party({ availability: [{ weekday: 1, startMinute: 1140, endMinute: 1320 }] }); // seg 19–22
    const b = party({ availability: [{ weekday: 1, startMinute: 1200, endMinute: 1380 }] }); // seg 20–23
    expect(overlapMinutes(a, b)).toBe(120);
  });

  it('considera fusos diferentes', () => {
    // 19–21h em São Paulo (UTC-3) = 22–24h UTC. Em Lisboa (UTC+0, 22–24h) sobrepõe totalmente.
    const saoPaulo = party({
      availability: [{ weekday: 2, startMinute: 1140, endMinute: 1260 }],
      utcOffsetMinutes: -180,
    });
    const lisbon = party({
      availability: [{ weekday: 2, startMinute: 1320, endMinute: 1440 }],
      utcOffsetMinutes: 0,
    });
    expect(overlapMinutes(saoPaulo, lisbon)).toBe(120);
  });

  it('trata a virada da semana (domingo à noite em UTC vira segunda)', () => {
    const intervals = toUtcWeekIntervals(
      [{ weekday: 6, startMinute: 22 * 60, endMinute: 24 * 60 }],
      -180,
    );
    // Sábado 22–24h em UTC-3 = domingo 01–03h UTC (início da semana UTC).
    expect(intervals).toEqual([[1 * 60, 3 * 60]]);
  });

  it('sem horários, não há sobreposição', () => {
    expect(overlapMinutes(party({ availability: [] }), party())).toBe(0);
  });
});
