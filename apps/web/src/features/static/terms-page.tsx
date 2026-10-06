import { PageMeta } from '@/components/seo/page-meta';
import { LegalLayout } from './legal-layout';

export function TermsPage() {
  return (
    <LegalLayout title="Termos de uso" updated="outubro de 2026">
      <PageMeta title="Termos de uso" description="Regras de uso da plataforma KNOW-KNOW." />
      <p>
        Ao criar uma conta na KNOW-KNOW você concorda com estes termos. Eles existem para que a
        troca de conhecimento seja segura e justa para todo mundo.
      </p>

      <h2>1. O que é a KNOW-KNOW</h2>
      <p>
        Uma plataforma que conecta pessoas que querem ensinar e aprender. Cada aula concluída gera
        créditos para quem ensina, e esses créditos podem ser usados para aprender com outras
        pessoas. A KNOW-KNOW não fornece o conteúdo das aulas nem a ferramenta de videochamada.
      </p>

      <h2>2. Créditos</h2>
      <ul>
        <li>
          Créditos são uma unidade interna de troca, <strong>não têm valor em dinheiro</strong> e
          não podem ser vendidos ou transferidos manualmente.
        </li>
        <li>
          Ao solicitar uma aula, os créditos ficam reservados. Eles só passam para quem ensinou
          quando os dois confirmam que a aula aconteceu.
        </li>
        <li>Se a aula for recusada, cancelada ou não acontecer, a reserva é devolvida.</li>
        <li>
          Em caso de divergência entre as respostas, a equipe pode analisar o caso e decidir o
          destino dos créditos.
        </li>
      </ul>

      <h2>3. Suas responsabilidades</h2>
      <ul>
        <li>Informar dados verdadeiros e manter sua conta segura.</li>
        <li>Comparecer às aulas combinadas e avisar com antecedência se não puder.</li>
        <li>
          Tratar todas as pessoas com respeito. Não é permitido assédio, discriminação, spam ou
          conteúdo ilegal.
        </li>
        <li>Avaliar com honestidade e apenas aulas de que participou.</li>
        <li>Para aulas presenciais, escolher locais seguros e públicos.</li>
      </ul>

      <h2>4. O que podemos fazer</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes termos, analisar denúncias e ajustar
        créditos quando houver erro ou abuso comprovado.
      </p>

      <h2>5. Limites</h2>
      <p>
        A KNOW-KNOW intermedeia o encontro entre pessoas e não garante o resultado de aprendizado.
        Cada pessoa é responsável pelo conteúdo que ensina e pelas combinações que faz.
      </p>

      <h2>6. Mudanças</h2>
      <p>
        Podemos atualizar estes termos. Avisaremos na plataforma quando houver mudanças relevantes.
      </p>

      <p className="text-sm text-fg-muted">
        Este documento é um modelo para o MVP acadêmico e deve ser revisado por um profissional
        jurídico antes de um lançamento comercial.
      </p>
    </LegalLayout>
  );
}
