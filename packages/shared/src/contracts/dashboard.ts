import type { ExploreCard } from './explore';
import type { SessionView } from './sessions';
import type { WalletView } from './wallet';

export interface DashboardView {
  wallet: WalletView;
  /** Próxima aula em que sou aluno. */
  nextLearning: SessionView | null;
  /** Próxima aula em que sou mentor. */
  nextTeaching: SessionView | null;
  stats: {
    hoursTaught: number;
    hoursLearned: number;
    ratingAverage: number | null;
    ratingCount: number;
  };
  /** Coisas que esperam uma ação minha. */
  pending: {
    requestsForMe: number;
    awaitingMyConfirmation: number;
    reviewsToWrite: number;
  };
  /** Pessoas que podem ensinar o que eu procuro. */
  recommendations: ExploreCard[];
}
