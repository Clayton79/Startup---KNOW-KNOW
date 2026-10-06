import type { PersonSummary, SessionView } from '@know-know/shared';
import { formatCredits } from '@/lib/format';

export function otherPerson(session: SessionView): PersonSummary {
  return session.myRole === 'MENTOR' ? session.student : session.mentor;
}

/** Frase curta e humana sobre o momento da aula, do ponto de vista de quem está olhando. */
export function statusHint(session: SessionView): string {
  const other = otherPerson(session).displayName;
  const mentor = session.myRole === 'MENTOR';
  const cost = formatCredits(session.creditCost);

  switch (session.status) {
    case 'PENDING':
      if (session.awaitingMyResponse) {
        return mentor && session.lastProposedById === session.student.id
          ? `${other} gostaria de aprender ${session.skill.name} com você.`
          : `${other} sugeriu outro horário. Pode ser?`;
      }
      return mentor
        ? `Aguardando a resposta de ${other} ao horário que você sugeriu.`
        : `Aguardando a resposta de ${other}. Reservamos ${cost} até lá.`;
    case 'ACCEPTED':
      return 'Tudo certo! A aula está confirmada.';
    case 'IN_PROGRESS':
      return 'A aula está acontecendo agora.';
    case 'AWAITING_CONFIRMATION':
      return session.myConfirmation === null
        ? 'A aula terminou. Conte se ela aconteceu para liberar os créditos.'
        : `Você já respondeu. Aguardando ${other}.`;
    case 'COMPLETED':
      return mentor
        ? `Aula concluída. Você recebeu ${cost}.`
        : `Aula concluída. Você usou ${cost}.`;
    case 'REJECTED':
      return mentor
        ? 'Você recusou esta solicitação.'
        : `${other} não pôde fazer essa aula. Seus créditos foram liberados.`;
    case 'CANCELLED':
      return mentor
        ? 'Essa aula foi cancelada.'
        : 'Essa aula foi cancelada e seus créditos foram liberados.';
    case 'NO_SHOW':
      return 'A aula não aconteceu. Nenhum crédito foi transferido.';
    case 'DISPUTED':
      return 'Vocês responderam diferente. Nossa equipe vai analisar e os créditos ficam reservados até lá.';
  }
}
