import type { AvailabilityRuleView } from '@know-know/shared';
import { formatMinutes } from '@/lib/format';
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABEL } from '@/lib/labels';

/** Resumo legível dos horários semanais ("Segunda: 19h–22h"). */
export function AvailabilitySummary({ rules }: { rules: AvailabilityRuleView[] }) {
  if (rules.length === 0) {
    return <p className="text-fg-muted">Ainda não informou horários.</p>;
  }

  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
      {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
        const day = rules
          .filter((rule) => rule.weekday === weekday)
          .sort((a, b) => a.startMinute - b.startMinute);
        if (day.length === 0) return null;
        return (
          <div key={weekday} className="contents">
            <dt className="font-semibold">{WEEKDAY_LABEL[weekday]}</dt>
            <dd className="text-fg-muted">
              {day
                .map(
                  (rule) => `${formatMinutes(rule.startMinute)}–${formatMinutes(rule.endMinute)}`,
                )
                .join(' · ')}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
