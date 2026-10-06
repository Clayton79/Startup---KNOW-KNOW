/**
 * Datas chegam da API em UTC (ISO 8601) e são mostradas no fuso do navegador da pessoa,
 * em português. Nada aqui calcula regra de negócio: só apresentação.
 */

const weekdayDay = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const shortDay = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const weekdayOnly = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "19h" ou "19h30", no fuso do navegador. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, '0')}`;
}

/** "quarta-feira, 7 de outubro". */
export function formatDay(iso: string): string {
  return weekdayDay.format(new Date(iso));
}

/** "qua., 7 de out.". */
export function formatShortDay(iso: string): string {
  return shortDay.format(new Date(iso));
}

/** "quarta-feira, 7 de outubro · 19h". */
export function formatDateTime(iso: string): string {
  return `${formatDay(iso)} · ${formatTime(iso)}`;
}

/** "19h às 20h". */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} às ${formatTime(endIso)}`;
}

/** "hoje", "amanhã" ou o dia da semana (para listas e cartões). */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const target = new Date(iso);
  const startOf = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOf(target) - startOf(now)) / 86_400_000);
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanhã';
  if (diffDays === -1) return 'ontem';
  if (diffDays > 1 && diffDays < 7) return weekdayOnly.format(target);
  return fullDate.format(target);
}

/** Chave "AAAA-MM-DD" do dia local, para agrupar por dia. */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "há 5 min", "há 2 h", "ontem" ou a data. */
export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'agora há pouco';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return fullDate.format(new Date(iso));
}
