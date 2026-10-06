import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand/logo';
import { PageMeta } from '@/components/seo/page-meta';
import { Card } from '@/components/ui/card';

/** Moldura das telas de entrada: logo, título e um card central. */
export function AuthLayout({
  title,
  subtitle,
  pageTitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  pageTitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:py-16">
      <PageMeta title={pageTitle} noindex />
      <BrandLogo className="self-center" />
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-fg-muted">{subtitle}</p> : null}
      </div>
      <Card>{children}</Card>
      {footer ? <p className="text-center text-fg-muted">{footer}</p> : null}
    </div>
  );
}
