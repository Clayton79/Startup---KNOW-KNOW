import type { SlotView } from '@know-know/shared';
import { CalendarX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/cn';
import { dayKey, formatShortDay, formatTime } from '@/lib/datetime';
import { useSlots } from './use-sessions';

/** Escolha de dia e horário entre os horários realmente livres da pessoa. */
export function SlotPicker({
  userId,
  durationMinutes,
  value,
  onChange,
  idPrefix = 'slot',
}: {
  userId: string;
  durationMinutes: number;
  value: string | null;
  onChange: (startsAt: string | null) => void;
  idPrefix?: string;
}) {
  const { data, isPending, isError, error, refetch } = useSlots(userId, durationMinutes);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, SlotView[]>();
    for (const slot of data?.slots ?? []) {
      const key = dayKey(slot.startsAt);
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    return map;
  }, [data]);

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (byDay.size === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="Sem horários livres nas próximas semanas"
        description="Essa pessoa não tem horários para uma aula dessa duração. Tente uma duração menor ou volte mais tarde."
      />
    );
  }

  const days = [...byDay.keys()];
  const activeDay = selectedDay && byDay.has(selectedDay) ? selectedDay : (days[0] as string);
  const slots = byDay.get(activeDay) ?? [];

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Escolha o dia" className="flex gap-2 overflow-x-auto pb-1">
        {days.map((key) => {
          const first = byDay.get(key)?.[0];
          if (!first) return null;
          const active = key === activeDay;
          return (
            <button
              key={key}
              type="button"
              id={`${idPrefix}-day-${key}`}
              aria-pressed={active}
              onClick={() => {
                setSelectedDay(key);
                onChange(null);
              }}
              className={cn(
                'min-h-11 shrink-0 rounded-md border px-3 text-sm font-semibold capitalize transition-colors',
                active
                  ? 'border-primary bg-primary-soft text-primary-strong'
                  : 'border-border-strong bg-surface hover:bg-surface-muted',
              )}
            >
              {formatShortDay(first.startsAt)}
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Escolha o horário" className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const selected = value === slot.startsAt;
          return (
            <button
              key={slot.startsAt}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(slot.startsAt)}
              className={cn(
                'min-h-11 min-w-20 rounded-full border px-4 text-sm font-semibold transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border-strong bg-surface hover:bg-surface-muted',
              )}
            >
              {formatTime(slot.startsAt)}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-fg-muted">Horários no fuso do seu navegador.</p>
    </div>
  );
}
