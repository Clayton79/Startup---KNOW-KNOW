import { useState } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const sizes = {
  sm: 'size-9 text-sm',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
  xl: 'size-28 text-3xl',
};

/** Foto do perfil, com as iniciais como alternativa quando não há imagem (ou ela falha). */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-bold text-primary-strong',
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={`Foto de ${name}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
