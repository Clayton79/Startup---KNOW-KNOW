import { Check, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useSkillCatalog } from '@/features/profile/use-profile';

/**
 * Escolha múltipla de habilidades do catálogo, agrupadas por categoria, com busca.
 * Cada habilidade é um botão-alternador (aria-pressed): funciona por teclado e toque.
 */
export function SkillChipPicker({
  selectedIds,
  onToggle,
  label,
  max,
}: {
  selectedIds: ReadonlySet<string>;
  onToggle: (skillId: string) => void;
  label: string;
  max?: number;
}) {
  const { data: catalog, isPending, isError } = useSkillCatalog();
  const [query, setQuery] = useState('');
  const searchId = useId();
  const atLimit = max !== undefined && selectedIds.size >= max;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!catalog) return [];
    return catalog
      .map((category) => ({
        ...category,
        skills: category.skills.filter(
          (skill) => term === '' || skill.name.toLowerCase().includes(term),
        ),
      }))
      .filter((category) => category.skills.length > 0);
  }, [catalog, query]);

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <Alert tone="error">
        Não conseguimos carregar a lista de conhecimentos. Recarregue a página.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscar {label}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted"
        />
        <Input
          id={searchId}
          type="search"
          placeholder="Buscar (ex.: inglês, Java, violão)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-10"
        />
      </div>

      {atLimit ? (
        <p role="status" className="text-sm text-fg-muted">
          Você chegou ao limite de {max} itens. Remova algum para escolher outro.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-fg-muted">Nada encontrado para “{query}”.</p>
      ) : (
        filtered.map((category) => (
          <fieldset key={category.id} className="space-y-2">
            <legend className="text-sm font-bold text-fg-muted">{category.name}</legend>
            <div className="flex flex-wrap gap-2">
              {category.skills.map((skill) => {
                const selected = selectedIds.has(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selected && atLimit}
                    onClick={() => onToggle(skill.id)}
                    className={cn(
                      'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-50',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border-strong bg-surface text-fg hover:bg-surface-muted',
                    )}
                  >
                    {selected ? <Check aria-hidden="true" className="size-4" /> : null}
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))
      )}
    </div>
  );
}
