import type { ReactNode } from 'react';

/** Moldura de texto longo (termos, privacidade) com tipografia confortável. */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-brand [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
      <h1 className="text-3xl font-extrabold text-brand sm:text-4xl">{title}</h1>
      <p className="text-sm text-fg-muted">Atualizado em {updated}</p>
      {children}
    </article>
  );
}
