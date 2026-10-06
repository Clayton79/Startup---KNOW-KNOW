import { CheckCheck, EyeOff, ShieldCheck, Star } from 'lucide-react';

const items = [
  {
    icon: CheckCheck,
    title: 'Aula confirmada pelos dois',
    text: 'Os créditos só mudam de mãos quando aluno e mentor confirmam que a aula aconteceu.',
  },
  {
    icon: Star,
    title: 'Avaliações de quem participou',
    text: 'Só quem fez a aula pode avaliar, com a média e o número de avaliações visíveis no perfil.',
  },
  {
    icon: EyeOff,
    title: 'Links privados',
    text: 'O link da reunião só aparece para os dois participantes, depois que a aula é aceita.',
  },
  {
    icon: ShieldCheck,
    title: 'Seus dados protegidos',
    text: 'Coletamos só o necessário e você pode excluir sua conta quando quiser.',
  },
];

export function TrustSection() {
  return (
    <section aria-labelledby="confianca-titulo" className="bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <h2 id="confianca-titulo" className="text-3xl font-extrabold text-brand sm:text-4xl">
            Segurança e reputação
          </h2>
          <p className="text-lg text-fg-muted">
            Confiança entre pessoas se constrói com transparência.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.title}
              className="flex gap-4 rounded-lg border border-border bg-surface p-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
                <item.icon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-lg font-bold">{item.title}</span>
                <span className="mt-1 block text-fg-muted">{item.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
