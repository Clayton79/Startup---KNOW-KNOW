import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/features/config/use-public-config';
import { formatCredits } from '@/lib/format';

export function HowItWorksPage() {
  const { data: config } = usePublicConfig();
  const rate = config ? formatCredits(config.creditsPerHour) : 'créditos';

  const steps = [
    {
      title: 'Crie seu perfil',
      text: 'Conte o que você sabe ensinar, o que quer aprender e quando costuma estar disponível. Leva poucos minutos.',
    },
    {
      title: 'Encontre alguém',
      text: 'Busque o conhecimento que você quer. Mostramos quem ensina, a avaliação de cada pessoa, os horários livres e quanto custa.',
    },
    {
      title: 'Peça uma aula',
      text: 'Escolha a duração e um horário livre. Reservamos os créditos para você. Quem ensina aceita, recusa ou sugere outro horário.',
    },
    {
      title: 'Faça a aula como preferir',
      text: 'Google Meet, Discord ou presencialmente. A KNOW-KNOW não grava nem hospeda a chamada: só combina e garante a troca.',
    },
    {
      title: 'Confirme e troque créditos',
      text: `Depois da aula, os dois confirmam que ela aconteceu. Só então os créditos passam para quem ensinou: 1 hora = ${rate}.`,
    },
    {
      title: 'Avalie e construa reputação',
      text: 'Quem participou pode avaliar. A média e o número de avaliações aparecem no perfil, para todo mundo decidir com segurança.',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
      <PageMeta
        title="Como funciona"
        description="Entenda como ensinar, ganhar créditos e aprender com outras pessoas na KNOW-KNOW."
      />
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold text-brand sm:text-4xl">
          Como a KNOW-KNOW funciona
        </h1>
        <p className="text-lg text-fg-muted">
          Ensine o que você sabe para aprender aquilo que você quer. Sem dinheiro no meio: o que
          circula é o seu tempo e o seu conhecimento.
        </p>
      </header>

      <ol className="space-y-6">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-secondary">
              {index + 1}
            </span>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{step.title}</h2>
              <p className="text-fg-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="exemplo" className="space-y-3 rounded-xl bg-secondary p-6">
        <h2 id="exemplo" className="text-xl font-bold text-brand">
          Exemplo
        </h2>
        <p>
          O João sabe Java e ensina o Lucas. O João ganha créditos. A Maria ensina inglês. O João
          usa os créditos que ganhou para ter aula de inglês com a Maria. Ninguém precisou encontrar
          alguém que quisesse a troca exata: os créditos circulam entre todas as pessoas.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/cadastro">
            Começar gratuitamente
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/explorar">Explorar conhecimentos</Link>
        </Button>
      </div>
    </div>
  );
}
