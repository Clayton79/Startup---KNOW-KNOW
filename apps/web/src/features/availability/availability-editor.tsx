import { LIMITS } from '@know-know/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { minutesToTimeInput, timeInputToMinutes } from '@/lib/format';
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABEL } from '@/lib/labels';

export interface AvailabilityDraft {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

const DEFAULT_RANGE = { startMinute: 19 * 60, endMinute: 21 * 60 };

/** Retorna uma mensagem se houver faixas inválidas ou sobrepostas; senão, null. */
export function validateAvailability(rules: AvailabilityDraft[]): string | null {
  for (const rule of rules) {
    if (rule.endMinute <= rule.startMinute) {
      return `Em ${WEEKDAY_LABEL[rule.weekday]?.toLowerCase()}, o horário final precisa ser depois do inicial.`;
    }
  }
  for (const weekday of WEEKDAY_DISPLAY_ORDER) {
    const day = rules
      .filter((rule) => rule.weekday === weekday)
      .sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < day.length; i++) {
      if (day[i]!.startMinute < day[i - 1]!.endMinute) {
        return `Em ${WEEKDAY_LABEL[weekday]?.toLowerCase()}, há horários que se sobrepõem.`;
      }
    }
  }
  return null;
}

/** Horários semanais recorrentes, por dia, em campos de hora nativos (ótimos no celular). */
export function AvailabilityEditor({
  value,
  onChange,
}: {
  value: AvailabilityDraft[];
  onChange: (next: AvailabilityDraft[]) => void;
}) {
  const baseId = useId();
  const atLimit = value.length >= LIMITS.maxAvailabilityRules;

  const add = (weekday: number) => onChange([...value, { weekday, ...DEFAULT_RANGE }]);
  const remove = (target: AvailabilityDraft) => onChange(value.filter((rule) => rule !== target));
  const update = (target: AvailabilityDraft, patch: Partial<AvailabilityDraft>) =>
    onChange(value.map((rule) => (rule === target ? { ...rule, ...patch } : rule)));

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
        const label = WEEKDAY_LABEL[weekday] as string;
        const rules = value
          .filter((rule) => rule.weekday === weekday)
          .sort((a, b) => a.startMinute - b.startMinute);

        return (
          <li key={weekday} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <p className="w-24 shrink-0 pt-2 font-bold">{label}</p>

            <div className="flex flex-1 flex-col gap-2">
              {rules.length === 0 ? (
                <p className="pt-2 text-fg-muted">Indisponível</p>
              ) : (
                rules.map((rule, index) => {
                  const startId = `${baseId}-${weekday}-${index}-start`;
                  const endId = `${baseId}-${weekday}-${index}-end`;
                  return (
                    <div
                      key={`${rule.startMinute}-${index}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <label htmlFor={startId} className="sr-only">
                        {label}: início
                      </label>
                      <Input
                        id={startId}
                        type="time"
                        step={900}
                        className="w-32"
                        value={minutesToTimeInput(rule.startMinute)}
                        onChange={(event) => {
                          const minutes = timeInputToMinutes(event.target.value);
                          if (minutes !== null) update(rule, { startMinute: minutes });
                        }}
                      />
                      <span aria-hidden="true">até</span>
                      <label htmlFor={endId} className="sr-only">
                        {label}: fim
                      </label>
                      <Input
                        id={endId}
                        type="time"
                        step={900}
                        className="w-32"
                        value={minutesToTimeInput(rule.endMinute === 1440 ? 1439 : rule.endMinute)}
                        onChange={(event) => {
                          const minutes = timeInputToMinutes(event.target.value);
                          if (minutes !== null) update(rule, { endMinute: minutes });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover horário de ${label}`}
                        onClick={() => remove(rule)}
                      >
                        <Trash2 aria-hidden="true" className="size-5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={atLimit}
              onClick={() => add(weekday)}
              aria-label={`Adicionar horário em ${label}`}
            >
              <Plus aria-hidden="true" className="size-4" />
              Horário
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
