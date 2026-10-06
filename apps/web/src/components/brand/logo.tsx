import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * Símbolo oficial (recorte da logo, sem alterações) + nome em texto.
 * Quando houver a logo vetorial oficial, basta trocar a <img>.
 */
export function BrandLogo({
  className,
  tone = 'dark',
  to = '/',
}: {
  className?: string;
  tone?: 'dark' | 'light';
  to?: string;
}) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2.5 rounded-md', className)}
      aria-label="KNOW-KNOW, página inicial"
    >
      <img src="/brand/mark-192.png" alt="" width={36} height={36} className="size-9 rounded-lg" />
      <span
        className={cn(
          'text-lg font-extrabold uppercase tracking-tight',
          tone === 'dark' ? 'text-brand' : 'text-secondary',
        )}
      >
        Know-Know
      </span>
    </Link>
  );
}
