import type { SlotView } from '@know-know/shared';
import { DateTime } from 'luxon';

export interface RuleLite {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface BusyRange {
  startsAt: Date;
  endsAt: Date;
}

/** Luxon: segunda=1 … domingo=7. O app usa domingo=0 … sábado=6. */
function appWeekday(date: DateTime): number {
  return date.weekday % 7;
}

/**
 * A aula (início + duração) cabe inteira dentro de uma faixa semanal do mentor?
 * A comparação é feita no fuso do mentor, e a aula não pode atravessar a meia-noite.
 */
export function fitsAvailability(
  rules: RuleLite[],
  timezone: string,
  startsAt: Date,
  durationMinutes: number,
): boolean {
  const local = DateTime.fromJSDate(startsAt, { zone: timezone });
  if (!local.isValid) return false;

  const startMinute = local.hour * 60 + local.minute;
  const endMinute = startMinute + durationMinutes;
  if (endMinute > 1440) return false;

  const weekday = appWeekday(local);
  return rules.some(
    (rule) =>
      rule.weekday === weekday && rule.startMinute <= startMinute && rule.endMinute >= endMinute,
  );
}

export interface SlotOptions {
  rules: RuleLite[];
  timezone: string;
  from: Date;
  days: number;
  durationMinutes: number;
  busy: BusyRange[];
  minLeadMinutes: number;
  stepMinutes?: number;
}

/** Horários livres para uma aula de `durationMinutes`: dentro da disponibilidade e fora de aulas já marcadas. */
export function generateSlots(options: SlotOptions): SlotView[] {
  const { rules, timezone, from, days, durationMinutes, busy, minLeadMinutes } = options;
  const step = options.stepMinutes ?? 30;
  const earliest = from.getTime() + minLeadMinutes * 60_000;
  const startOfToday = DateTime.fromJSDate(from, { zone: timezone }).startOf('day');
  if (!startOfToday.isValid) return [];

  const slots: SlotView[] = [];
  for (let offset = 0; offset < days; offset++) {
    const day = startOfToday.plus({ days: offset });
    const dayRules = rules
      .filter((rule) => rule.weekday === appWeekday(day))
      .sort((a, b) => a.startMinute - b.startMinute);

    for (const rule of dayRules) {
      for (let start = rule.startMinute; start + durationMinutes <= rule.endMinute; start += step) {
        const startsAt = day.set({ hour: Math.floor(start / 60), minute: start % 60 }).toJSDate();
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        if (startsAt.getTime() < earliest) continue;
        const overlaps = busy.some((range) => range.startsAt < endsAt && range.endsAt > startsAt);
        if (overlaps) continue;
        slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
      }
    }
  }
  return slots;
}
