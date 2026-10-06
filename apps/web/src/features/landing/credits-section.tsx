import { Coins, Gift, Repeat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicConfig } from '@/features/config/use-public-config';

export function CreditsSection() {
  const { data: config, isPending } = usePublicConfig();

  return (
    <section aria-labelledby="creditos-titulo" className="bg-background">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="space-y-5">
          <h2 id="creditos-titulo" className="text-3xl font-extrabold text-brand sm:text-4xl">
            Créditos: o tempo que você dedica vale algo
          </h2>
          <p className="text-lg text-fg-muted">
            Cada aula que você dá rende créditos. Cada aula que você assiste usa créditos. Como o
            saldo é da plataforma, você não depende de encontrar alguém que queira aprender o que
            você ensina <em>e</em> ensine o que você quer aprender.
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <Repeat aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary-strong" />
              <span>Trocas indiretas: ensine para uma pessoa, aprenda com outra.</span>
            </li>
            <li className="flex gap-3">
              <Gift aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary-strong" />
              <span>
                {config ? (
                  <>
                    Você começa com {config.welcomeBonusCredits} créditos de boas-vindas para
                    experimentar.
                  </>
                ) : (
                  'Você começa com créditos de boas-vindas para experimentar.'
                )}
              </span>
            </li>
            <li className="flex gap-3">
              <Coins aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary-strong" />
              <span>Cada transação fica registrada no seu histórico, com data e motivo.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-brand p-6 text-primary-foreground shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-secondary/80">Taxa atual</p>
          {isPending ? (
            <Skeleton className="mt-3 h-14 w-64 bg-brand-soft" />
          ) : config ? (
            <p className="mt-3 text-4xl font-extrabold sm:text-5xl">
              1 hora de aula
              <span className="block text-credit">= {config.creditsPerHour} créditos</span>
            </p>
          ) : (
            <p className="mt-3 text-2xl font-bold">Cada hora de aula gera créditos.</p>
          )}
          <p className="mt-4 text-primary-foreground/80">
            Aulas de 30, 60, 90 ou 120 minutos, com custo proporcional ao tempo.
          </p>
        </div>
      </div>
    </section>
  );
}
