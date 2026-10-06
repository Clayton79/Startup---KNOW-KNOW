import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const tones = {
  error: { icon: AlertCircle, classes: 'bg-error-soft text-error', role: 'alert' as const },
  success: { icon: CheckCircle2, classes: 'bg-success-soft text-success', role: 'status' as const },
  info: { icon: Info, classes: 'bg-primary-soft text-primary-strong', role: 'status' as const },
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, classes, role } = tones[tone];
  return (
    <div role={role} className={cn('flex gap-3 rounded-md p-4 text-sm', classes, className)}>
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}
