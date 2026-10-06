import { describe, expect, it } from 'vitest';
import {
  formatCredits,
  formatLocation,
  formatMinutes,
  formatReputation,
  initials,
  minutesToTimeInput,
  timeInputToMinutes,
} from './format';

describe('format', () => {
  it('formata horários', () => {
    expect(formatMinutes(19 * 60)).toBe('19h');
    expect(formatMinutes(19 * 60 + 30)).toBe('19h30');
    expect(formatMinutes(9 * 60 + 5)).toBe('9h05');
  });

  it('converte entre minutos e campo de hora', () => {
    expect(minutesToTimeInput(1170)).toBe('19:30');
    expect(timeInputToMinutes('19:30')).toBe(1170);
    expect(timeInputToMinutes('')).toBeNull();
  });

  it('mostra reputação com média e quantidade, nunca só estrelas', () => {
    expect(formatReputation({ average: 4.8, count: 27 })).toBe('4,8 · 27 avaliações');
    expect(formatReputation({ average: 5, count: 1 })).toBe('5,0 · 1 avaliação');
    expect(formatReputation({ average: null, count: 0 })).toBe('Ainda sem avaliações');
  });

  it('flexiona créditos no singular e no plural', () => {
    expect(formatCredits(1)).toBe('1 crédito');
    expect(formatCredits(10)).toBe('10 créditos');
    expect(formatCredits(-5)).toBe('-5 créditos');
  });

  it('gera iniciais e localização', () => {
    expect(initials('Ana Paula Souza')).toBe('AS');
    expect(initials('Clayton')).toBe('C');
    expect(formatLocation('Curitiba', 'PR')).toBe('Curitiba, PR');
    expect(formatLocation(null, null)).toBeNull();
  });
});
