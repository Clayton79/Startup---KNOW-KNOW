import { AppConfig } from './app-config.service';

function configWith(creditsPerHour: number): AppConfig {
  const fake = { get: () => creditsPerHour } as never;
  return new AppConfig(fake);
}

describe('custo de aula em créditos', () => {
  it.each([
    [30, 5],
    [60, 10],
    [90, 15],
    [120, 20],
  ])('%i min custam %i créditos com a taxa padrão', (minutes, cost) => {
    expect(configWith(10).creditCostFor(minutes)).toBe(cost);
  });

  it('arredonda para cima para nunca gerar crédito fracionado', () => {
    expect(configWith(5).creditCostFor(30)).toBe(3); // 2,5 → 3
  });
});
