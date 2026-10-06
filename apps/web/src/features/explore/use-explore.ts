import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { exploreApi, type ExploreFilters } from './explore-api';

export function useExplore(filters: ExploreFilters, authenticated: boolean) {
  return useQuery({
    // O resultado muda com o login (pontuação de match), então entra na chave.
    queryKey: ['explore', authenticated, filters],
    queryFn: () => exploreApi.search(filters),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}
