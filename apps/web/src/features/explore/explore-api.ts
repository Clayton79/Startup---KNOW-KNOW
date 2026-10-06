import type { ExploreCard, Paginated, SkillLevel } from '@know-know/shared';
import { api } from '@/lib/api-client';

export interface ExploreFilters {
  q?: string;
  skillId?: string;
  level?: SkillLevel;
  minRating?: number;
  mode?: 'ONLINE' | 'IN_PERSON';
  available?: boolean;
  page?: number;
}

export const exploreApi = {
  search: (filters: ExploreFilters) =>
    api.get<Paginated<ExploreCard>>('/explore', {
      ...filters,
      pageSize: 12,
      available: filters.available ? 'true' : undefined,
    }),
  matches: (limit = 4) => api.get<ExploreCard[]>('/matches', { limit }),
};
