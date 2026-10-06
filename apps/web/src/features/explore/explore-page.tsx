import { SkillLevel } from '@know-know/shared';
import { Filter, Search, SearchX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/auth-provider';
import { useSkillCatalog } from '@/features/profile/use-profile';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SKILL_LEVEL_LABEL } from '@/lib/labels';
import type { ExploreFilters } from './explore-api';
import { MentorCard } from './mentor-card';
import { useExplore } from './use-explore';

function parseFilters(params: URLSearchParams): ExploreFilters {
  const level = params.get('nivel');
  const mode = params.get('modo');
  const rating = Number(params.get('nota'));
  const page = Number(params.get('pagina'));
  return {
    ...(params.get('q') ? { q: params.get('q') as string } : {}),
    ...(params.get('habilidade') ? { skillId: params.get('habilidade') as string } : {}),
    ...(level && level in SkillLevel ? { level: level as SkillLevel } : {}),
    ...(mode === 'ONLINE' || mode === 'IN_PERSON' ? { mode } : {}),
    ...(rating >= 1 && rating <= 5 ? { minRating: rating } : {}),
    ...(params.get('disponivel') === '1' ? { available: true } : {}),
    ...(page > 1 ? { page } : {}),
  };
}

export function ExplorePage() {
  const { status } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = parseFilters(params);
  const { data: catalog } = useSkillCatalog();
  const [showFilters, setShowFilters] = useState(false);

  // O texto da busca fica local e só vai para a URL (e para a API) depois de uma pausa na digitação.
  const [text, setText] = useState(filters.q ?? '');
  const debouncedText = useDebouncedValue(text);

  const setFilter = (key: string, value: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
        if (key !== 'pagina') next.delete('pagina');
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedText.trim()) setFilter('q', debouncedText.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText]);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useExplore(
    filters,
    status === 'authenticated',
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const page = filters.page ?? 1;
  const activeFilterCount = ['habilidade', 'nivel', 'modo', 'nota', 'disponivel'].filter((key) =>
    params.has(key),
  ).length;

  const clearAll = () => {
    setText('');
    setParams({}, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-0 sm:px-0">
      <PageMeta
        title="Explorar conhecimentos"
        description="Encontre pessoas que ensinam inglês, Java, violão e muito mais. Troque conhecimento por créditos."
        noindex={status === 'authenticated'}
      />

      <header className="space-y-2 px-4 pt-6 sm:px-0 sm:pt-0">
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Explorar conhecimentos</h1>
        <p className="text-fg-muted">
          Procure o que você quer aprender e veja quem pode te ensinar.
        </p>
      </header>

      <div className="space-y-4 px-4 sm:px-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <label htmlFor="busca" className="sr-only">
              Buscar por conhecimento ou pessoa
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted"
            />
            <Input
              id="busca"
              type="search"
              placeholder="Quero aprender… (ex.: inglês, Java, violão)"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            aria-expanded={showFilters}
            aria-controls="painel-filtros"
            onClick={() => setShowFilters((value) => !value)}
          >
            <Filter aria-hidden="true" className="size-5" />
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Button>
        </div>

        {showFilters ? (
          <div
            id="painel-filtros"
            className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <FormField label="Conhecimento">
              {(control) => (
                <Select
                  {...control}
                  value={filters.skillId ?? ''}
                  onChange={(event) => setFilter('habilidade', event.target.value)}
                >
                  <option value="">Todos</option>
                  {catalog?.map((category) => (
                    <optgroup key={category.id} label={category.name}>
                      {category.skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField label="Nível mínimo">
              {(control) => (
                <Select
                  {...control}
                  value={filters.level ?? ''}
                  onChange={(event) => setFilter('nivel', event.target.value)}
                >
                  <option value="">Qualquer</option>
                  {Object.values(SkillLevel).map((level) => (
                    <option key={level} value={level}>
                      {SKILL_LEVEL_LABEL[level]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField label="Avaliação mínima">
              {(control) => (
                <Select
                  {...control}
                  value={filters.minRating?.toString() ?? ''}
                  onChange={(event) => setFilter('nota', event.target.value)}
                >
                  <option value="">Qualquer</option>
                  <option value="3">3 ou mais</option>
                  <option value="4">4 ou mais</option>
                  <option value="4.5">4,5 ou mais</option>
                </Select>
              )}
            </FormField>

            <FormField label="Modalidade">
              {(control) => (
                <Select
                  {...control}
                  value={filters.mode ?? ''}
                  onChange={(event) => setFilter('modo', event.target.value)}
                >
                  <option value="">Online ou presencial</option>
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">Presencial</option>
                </Select>
              )}
            </FormField>

            <div className="flex items-end">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={filters.available === true}
                  onChange={(event) => setFilter('disponivel', event.target.checked ? '1' : null)}
                />
                <span className="font-semibold">Só com horários</span>
              </label>
            </div>
          </div>
        ) : null}

        {text !== '' || activeFilterCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X aria-hidden="true" className="size-4" />
            Limpar busca e filtros
          </Button>
        ) : null}
      </div>

      <section
        aria-live="polite"
        aria-busy={isPending || isPlaceholderData}
        className="space-y-4 px-4 sm:px-0"
      >
        {isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-72 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Ninguém encontrado com esses critérios"
            description="Tente outra palavra ou remova alguns filtros. Novas pessoas entram todos os dias."
            action={
              <Button variant="outline" onClick={clearAll}>
                Limpar busca e filtros
              </Button>
            }
          />
        ) : (
          <>
            <p className="text-sm text-fg-muted">
              {data.total} {data.total === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}
            </p>
            <ul
              className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}
            >
              {data.items.map((card) => (
                <li key={`${card.userId}-${card.skill.id}`}>
                  <MentorCard card={card} />
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <nav
                aria-label="Páginas de resultados"
                className="flex items-center justify-between pt-2"
              >
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setFilter('pagina', String(page - 1))}
                >
                  Anterior
                </Button>
                <span className="text-sm text-fg-muted">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setFilter('pagina', String(page + 1))}
                >
                  Próxima
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
