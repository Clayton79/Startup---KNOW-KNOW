import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi } from './admin-api';

function NewSkillForm() {
  const queryClient = useQueryClient();
  const { data: categories } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: adminApi.categories,
  });
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const create = useMutation({
    mutationFn: () =>
      adminApi.createSkill({
        categoryId: categoryId || (categories?.[0]?.id as string),
        name: name.trim(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] }),
  });

  const submit = async () => {
    try {
      await create.mutateAsync();
      toast.success('Conhecimento criado.');
      setName('');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-bold">Novo conhecimento</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <FormField label="Nome">
          {(control) => (
            <Input
              {...control}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Categoria">
          {(control) => (
            <Select
              {...control}
              value={categoryId || categories?.[0]?.id || ''}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <Button
          disabled={name.trim().length < 2}
          loading={create.isPending}
          onClick={() => void submit()}
        >
          Adicionar
        </Button>
      </div>
    </Card>
  );
}

export function AdminSkillsPage() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'skills'],
    queryFn: adminApi.skills,
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateSkill(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] }),
  });

  const flip = async (id: string, isActive: boolean) => {
    try {
      await toggle.mutateAsync({ id, isActive });
      toast.success(isActive ? 'Conhecimento ativado.' : 'Conhecimento desativado.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <NewSkillForm />

      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {data.map((skill) => (
            <li key={skill.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{skill.name}</p>
                <p className="text-sm text-fg-muted">{skill.categoryName}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={skill.isActive ? 'success' : 'neutral'}>
                  {skill.isActive ? 'Ativo' : 'Desativado'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void flip(skill.id, !skill.isActive)}
                >
                  {skill.isActive ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
