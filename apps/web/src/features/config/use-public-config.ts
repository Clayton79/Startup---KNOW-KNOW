import { publicConfigSchema, type PublicConfig } from '@know-know/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/** Regras públicas (taxa de créditos etc.). Muda raramente, então fica em cache por bastante tempo. */
export function usePublicConfig() {
  return useQuery<PublicConfig>({
    queryKey: ['public-config'],
    queryFn: async () => publicConfigSchema.parse(await api.get('/config')),
    staleTime: 10 * 60_000,
  });
}
