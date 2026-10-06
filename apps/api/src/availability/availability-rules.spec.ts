import { fitsAvailability, generateSlots } from './availability-rules';

const SP = 'America/Sao_Paulo'; // UTC-3, sem horário de verão desde 2019
// Quarta-feira, 7 de outubro de 2026
const wednesdayRules = [{ weekday: 3, startMinute: 18 * 60, endMinute: 21 * 60 }];

/** Cria uma data a partir de um horário de São Paulo (UTC-3). */
const sp = (day: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, day, hour + 3, minute));

describe('fitsAvailability', () => {
  it('aceita aula inteira dentro da faixa, no fuso do mentor', () => {
    expect(fitsAvailability(wednesdayRules, SP, sp(7, 19), 60)).toBe(true);
    expect(fitsAvailability(wednesdayRules, SP, sp(7, 18), 180)).toBe(true);
  });

  it('recusa aula que ultrapassa o fim da faixa', () => {
    expect(fitsAvailability(wednesdayRules, SP, sp(7, 20), 90)).toBe(false);
  });

  it('recusa aula antes do início ou em outro dia', () => {
    expect(fitsAvailability(wednesdayRules, SP, sp(7, 17, 30), 30)).toBe(false);
    expect(fitsAvailability(wednesdayRules, SP, sp(8, 19), 60)).toBe(false);
  });

  it('usa o fuso do mentor, não o do servidor: 19h em SP é 22h UTC', () => {
    const utcInstant = new Date(Date.UTC(2026, 9, 7, 22, 0));
    expect(fitsAvailability(wednesdayRules, SP, utcInstant, 60)).toBe(true);
    expect(fitsAvailability(wednesdayRules, 'UTC', utcInstant, 60)).toBe(false);
  });

  it('não permite atravessar a meia-noite', () => {
    const lateRules = [{ weekday: 3, startMinute: 22 * 60, endMinute: 1440 }];
    expect(fitsAvailability(lateRules, SP, sp(7, 23), 60)).toBe(true);
    expect(fitsAvailability(lateRules, SP, sp(7, 23, 30), 60)).toBe(false);
  });

  it('fuso inválido nunca encaixa', () => {
    expect(fitsAvailability(wednesdayRules, 'Marte/Olympus', sp(7, 19), 60)).toBe(false);
  });
});

describe('generateSlots', () => {
  const from = sp(7, 8); // quarta, 8h em SP

  it('lista horários de 30 em 30 minutos que cabem a duração', () => {
    const slots = generateSlots({
      rules: wednesdayRules,
      timezone: SP,
      from,
      days: 1,
      durationMinutes: 60,
      busy: [],
      minLeadMinutes: 30,
    });
    // 18:00, 18:30, 19:00, 19:30, 20:00 (a de 20:30 terminaria às 21:30)
    expect(slots).toHaveLength(5);
    expect(slots[0]?.startsAt).toBe(sp(7, 18).toISOString());
    expect(slots[4]?.startsAt).toBe(sp(7, 20).toISOString());
  });

  it('exclui horários que colidem com aulas já marcadas', () => {
    const slots = generateSlots({
      rules: wednesdayRules,
      timezone: SP,
      from,
      days: 1,
      durationMinutes: 60,
      busy: [{ startsAt: sp(7, 19), endsAt: sp(7, 20) }],
      minLeadMinutes: 30,
    });
    const starts = slots.map((slot) => slot.startsAt);
    expect(starts).toContain(sp(7, 18).toISOString());
    expect(starts).not.toContain(sp(7, 18, 30).toISOString());
    expect(starts).not.toContain(sp(7, 19).toISOString());
    expect(starts).not.toContain(sp(7, 19, 30).toISOString());
    expect(starts).toContain(sp(7, 20).toISOString());
  });

  it('respeita a antecedência mínima e não oferece horários passados', () => {
    const slots = generateSlots({
      rules: wednesdayRules,
      timezone: SP,
      from: sp(7, 18, 40),
      days: 1,
      durationMinutes: 30,
      busy: [],
      minLeadMinutes: 30,
    });
    expect(slots[0]?.startsAt).toBe(sp(7, 19, 30).toISOString());
  });

  it('percorre vários dias e só usa os dias com faixa', () => {
    const slots = generateSlots({
      rules: wednesdayRules,
      timezone: SP,
      from,
      days: 14,
      durationMinutes: 180,
      busy: [],
      minLeadMinutes: 30,
    });
    // Duas quartas (7 e 14) com um único horário de 3h cada.
    expect(slots.map((slot) => slot.startsAt)).toEqual([
      sp(7, 18).toISOString(),
      sp(14, 18).toISOString(),
    ]);
  });
});
