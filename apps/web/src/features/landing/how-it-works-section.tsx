import { CalendarCheck, Coins, Sparkles, Star } from 'lucide-react';

const steps = [
  {
    icon: Sparkles,
    title: 'Conte o que você sabe e o que quer aprender',
    text: 'Monte seu perfil em poucos minutos, com os conhecimentos que você ensina e os que deseja ter.',
  },
  {
    icon: CalendarCheck,
    title: 'Combine uma aula',
    text: 'Encontre pessoas, veja horários livres e envie uma solicitação. Quem ensina aceita ou sugere outro horário.',
  },
  {
    icon: Coins,
    title: 'Ensine e ganhe créditos',
    text: 'Quando a aula é confirmada pelos dois lados, os créditos vão para quem ensinou.',
  },
  {
    icon: Star,
    title: 'Use os créditos para aprender',
    text: 'Gaste os créditos com qualquer pessoa da plataforma e avalie cada experiência.',
  },
];

export function HowItWorksSection() {
  return (
    <section aria-labelledby="como-funciona-titulo" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <h2 id="como-funciona-titulo" className="text-3xl font-extrabold text-brand sm:text-4xl">
            Como funciona
          </h2>
          <p className="text-lg text-fg-muted">
            Um ciclo simples: o que você ensina vira o que você aprende.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
                  <step.icon aria-hidden="true" className="size-5" />
                </span>
                <span className="text-sm font-bold text-fg-muted">Passo {index + 1}</span>
              </span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-fg-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
