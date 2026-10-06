import { Star } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

const WORDS = ['Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

/**
 * Nota de 1 a 5 com botões de rádio nativos (setas do teclado funcionam e leitores de tela
 * anunciam "3 de 5"). As estrelas são só decoração visual.
 */
export function StarRating({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  error?: string | undefined;
}) {
  const name = useId();

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => {
          const filled = value !== null && score <= value;
          return (
            <label
              key={score}
              className="relative cursor-pointer rounded-md p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-focus"
            >
              <input
                type="radio"
                name={name}
                value={score}
                checked={value === score}
                onChange={() => onChange(score)}
                className="sr-only"
                aria-label={`${score} de 5: ${WORDS[score - 1]}`}
              />
              <Star
                aria-hidden="true"
                className={cn(
                  'size-8 transition-colors',
                  filled ? 'fill-credit text-credit' : 'text-border-strong',
                )}
              />
            </label>
          );
        })}
        <span className="ml-2 text-sm text-fg-muted" aria-live="polite">
          {value ? WORDS[value - 1] : 'Toque nas estrelas'}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
