/** Exibida quando faltam variáveis de ambiente, em vez de uma página em branco. */
export function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-2xl font-extrabold text-brand">Falta configurar o ambiente</h1>
      <p className="text-fg-muted">
        O app não conseguiu ler estas variáveis. Copie <code>apps/web/.env.example</code> para{' '}
        <code>apps/web/.env.local</code> e preencha os valores:
      </p>
      <ul className="list-disc space-y-1 pl-6 font-mono text-sm">
        {problems.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </main>
  );
}
