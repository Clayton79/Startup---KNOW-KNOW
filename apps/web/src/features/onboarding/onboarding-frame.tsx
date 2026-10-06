import { useEffect, useRef, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export const ONBOARDING_STEPS = 5;

/** Moldura de cada passo: progresso, título (recebe o foco ao trocar de passo) e conteúdo. */
export function OnboardingFrame({
  step,
  title,
  description,
  children,
  actions,
}: {
  /** Índice 0–4. */
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const current = step + 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-fg-muted">
          Passo {current} de {ONBOARDING_STEPS}
        </p>
        <div
          role="progressbar"
          aria-label="Progresso do perfil"
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS}
          aria-valuenow={current}
          aria-valuetext={`Passo ${current} de ${ONBOARDING_STEPS}`}
          className="h-2.5 overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(current / ONBOARDING_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-extrabold text-brand outline-none sm:text-3xl"
        >
          {title}
        </h1>
        {description ? <p className="text-fg-muted">{description}</p> : null}
      </div>

      <Card className="space-y-5">{children}</Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">{actions}</div>
    </div>
  );
}
