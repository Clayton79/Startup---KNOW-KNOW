import type { ReputationView } from '@know-know/shared';

/** 1140 → "19h", 1170 → "19h30". */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, '0')}`;
}

/** 1140 → "19:00" (valor de <input type="time">). */
export function minutesToTimeInput(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "19:30" → 1170. Retorna null se o valor for inválido. */
export function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const total = Number(match[1]) * 60 + Number(match[2]);
  return Number.isNaN(total) ? null : total;
}

/** "4,8 · 27 avaliações" (nunca só estrelas, para não passar confiança excessiva). */
export function formatReputation(reputation: ReputationView): string {
  if (reputation.average === null || reputation.count === 0) return 'Ainda sem avaliações';
  const average = reputation.average.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const noun = reputation.count === 1 ? 'avaliação' : 'avaliações';
  return `${average} · ${reputation.count} ${noun}`;
}

export function formatCredits(amount: number): string {
  return `${amount.toLocaleString('pt-BR')} ${Math.abs(amount) === 1 ? 'crédito' : 'créditos'}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function formatLocation(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`;
  return city ?? state ?? null;
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
}

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** ["Seg 19h–22h", "Qua 18h–21h"…] ordenado de segunda a domingo. */
export function availabilityChips(
  rules: { weekday: number; startMinute: number; endMinute: number }[],
): string[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return [...rules]
    .sort(
      (a, b) =>
        order.indexOf(a.weekday) - order.indexOf(b.weekday) || a.startMinute - b.startMinute,
    )
    .map(
      (rule) =>
        `${WEEKDAY_SHORT[rule.weekday]} ${formatMinutes(rule.startMinute)}–${formatMinutes(rule.endMinute)}`,
    );
}
