import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Arcos orbitais: motivo da logo, usado como decoração discreta. */
function OrbitDecoration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 400"
      className="pointer-events-none absolute -right-24 -top-24 size-[28rem] text-secondary/10"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
    >
      <ellipse cx="200" cy="200" rx="170" ry="120" transform="rotate(-25 200 200)" />
      <ellipse cx="200" cy="200" rx="150" ry="95" transform="rotate(40 200 200)" />
    </svg>
  );
}

function ExampleExchange() {
  const steps = [
    { who: 'João', text: 'ensina Java para o Lucas', result: '+ 10 créditos' },
    { who: 'João', text: 'usa os créditos em inglês com a Maria', result: '− 10 créditos' },
  ];
  return (
    <figure className="relative rounded-xl bg-secondary p-5 text-secondary-foreground shadow-lg sm:p-6">
      <figcaption className="mb-4 text-xs font-bold uppercase tracking-wider text-brand/70">
        Exemplo ilustrativo
      </figcaption>
      <ol className="space-y-3">
        {steps.map((step) => (
          <li
            key={step.text}
            className="flex items-center justify-between gap-3 rounded-md bg-surface px-4 py-3 shadow-sm"
          >
            <span>
              <strong>{step.who}</strong> {step.text}
            </span>
            <span className="shrink-0 rounded-full bg-credit px-2.5 py-0.5 text-sm font-bold text-credit-foreground">
              {step.result}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-brand/80">
        Ninguém precisa trocar diretamente: os créditos circulam entre todas as pessoas.
      </p>
    </figure>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand text-primary-foreground">
      <OrbitDecoration />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold sm:text-5xl lg:text-6xl">
            Aprenda o que quiser.
            <span className="block text-secondary">Ensine o que você sabe.</span>
          </h1>
          <p className="max-w-xl text-lg text-primary-foreground/85">
            Na KNOW-KNOW, seu conhecimento tem valor. Compartilhe aquilo que você domina, ganhe
            créditos e use-os para aprender com outras pessoas.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="onBrand">
              <Link to="/cadastro">
                Começar gratuitamente
                <ArrowRight aria-hidden="true" className="size-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="border border-secondary/40 text-secondary hover:bg-brand-soft"
            >
              <Link to="/explorar">Explorar conhecimentos</Link>
            </Button>
          </div>
        </div>

        <ExampleExchange />
      </div>
    </section>
  );
}
