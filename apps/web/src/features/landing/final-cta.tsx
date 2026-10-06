import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function FinalCta() {
  return (
    <section aria-labelledby="cta-final-titulo" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-xl bg-secondary px-6 py-12 text-center sm:px-12">
          <h2 id="cta-final-titulo" className="text-3xl font-extrabold text-brand sm:text-4xl">
            O que você sabe pode abrir portas para outra pessoa.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-secondary-foreground/80">
            Crie sua conta, conte o que você ensina e comece a aprender o que sempre quis.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/cadastro">Começar gratuitamente</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/explorar">Explorar conhecimentos</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
