import { describe, expect, it } from 'vitest';
import { dayKey, formatRelativeDay, formatTime, formatTimeAgo, formatTimeRange } from './datetime';

// Datas locais (sem "Z") para o teste não depender do fuso da máquina.
const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString();

describe('datetime', () => {
  it('formata horário cheio e com minutos', () => {
    expect(formatTime(local(7, 19))).toBe('19h');
    expect(formatTime(local(7, 19, 30))).toBe('19h30');
    expect(formatTime(local(7, 9, 5))).toBe('9h05');
    expect(formatTimeRange(local(7, 19), local(7, 20, 30))).toBe('19h às 20h30');
  });

  it('descreve o dia de forma relativa', () => {
    const now = new Date(2026, 9, 7, 12);
    expect(formatRelativeDay(local(7, 20), now)).toBe('hoje');
    expect(formatRelativeDay(local(8, 9), now)).toBe('amanhã');
    expect(formatRelativeDay(local(6, 9), now)).toBe('ontem');
    expect(formatRelativeDay(local(10, 9), now)).toBe('sábado');
    expect(formatRelativeDay(local(30, 9), now)).toBe('30/10/2026');
  });

  it('agrupa por dia local', () => {
    expect(dayKey(local(7, 8))).toBe('2026-10-07');
    expect(dayKey(local(7, 23))).toBe('2026-10-07');
  });

  it('mostra há quanto tempo algo aconteceu', () => {
    const now = new Date(2026, 9, 7, 12, 0, 0);
    expect(formatTimeAgo(new Date(2026, 9, 7, 11, 59, 40).toISOString(), now)).toBe(
      'agora há pouco',
    );
    expect(formatTimeAgo(new Date(2026, 9, 7, 11, 30).toISOString(), now)).toBe('há 30 min');
    expect(formatTimeAgo(new Date(2026, 9, 7, 9).toISOString(), now)).toBe('há 3 h');
    expect(formatTimeAgo(new Date(2026, 9, 6, 11).toISOString(), now)).toBe('ontem');
  });
});
