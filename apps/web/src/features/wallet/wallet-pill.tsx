import { Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useWallet } from './use-wallet';

/** Saldo disponível sempre à vista, com atalho para a carteira. */
export function WalletPill({ compact = false }: { compact?: boolean }) {
  const { data: wallet, isPending } = useWallet();
  const label = wallet ? `${wallet.available} créditos disponíveis` : 'Ver carteira';

  return (
    <Link
      to="/carteira"
      aria-label={wallet ? `Carteira: ${label}` : 'Carteira'}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-credit font-bold text-credit-foreground transition-opacity hover:opacity-90',
        compact ? 'h-9 px-3 text-sm' : 'h-11 w-full justify-between px-4',
      )}
    >
      <span className="inline-flex items-center gap-2">
        <Coins aria-hidden="true" className="size-4" />
        {compact ? null : <span className="text-sm font-semibold">Carteira</span>}
      </span>
      <span>{isPending ? '…' : (wallet?.available ?? 0)}</span>
    </Link>
  );
}
