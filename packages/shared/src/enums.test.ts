import { describe, expect, it } from 'vitest';
import {
  REVIEW_CATEGORIES_BY_DIRECTION,
  ReviewCategory,
  SessionStatus,
  sessionStatusSchema,
} from './enums';

describe('enums compartilhados', () => {
  it('expõe o objeto e o schema com os mesmos valores', () => {
    expect(Object.keys(SessionStatus).sort()).toEqual([...sessionStatusSchema.options].sort());
  });

  it('só avalia categorias válidas em cada direção', () => {
    const valid = Object.values(ReviewCategory);
    for (const categories of Object.values(REVIEW_CATEGORIES_BY_DIRECTION)) {
      expect(categories).toHaveLength(3);
      for (const category of categories) expect(valid).toContain(category);
    }
  });
});
