import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MeProfile, PublicProfile, SkillCatalogCategory } from '@know-know/shared';
import { profileApi } from './profile-api';

export const meQueryKey = ['me'] as const;

export function useMe(enabled = true) {
  return useQuery<MeProfile>({ queryKey: meQueryKey, queryFn: profileApi.getMe, enabled });
}

export function usePublicProfile(id: string | undefined) {
  return useQuery<PublicProfile>({
    queryKey: ['user', id],
    queryFn: () => profileApi.getUser(id as string),
    enabled: Boolean(id),
  });
}

export function useSkillCatalog() {
  return useQuery<SkillCatalogCategory[]>({
    queryKey: ['skills'],
    queryFn: profileApi.getSkillCatalog,
    staleTime: 10 * 60_000,
  });
}

/** Atualiza o cache do perfil com a resposta da API (evita um segundo request). */
export function useProfileMutation<TInput>(mutationFn: (input: TInput) => Promise<MeProfile>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (profile) => queryClient.setQueryData(meQueryKey, profile),
  });
}

/** Mutations de listas (conhecimentos, horários): depois de salvar, o perfil é recarregado. */
export function useInvalidateMeMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
}
