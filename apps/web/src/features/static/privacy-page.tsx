import { PageMeta } from '@/components/seo/page-meta';
import { LegalLayout } from './legal-layout';

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidade" updated="outubro de 2026">
      <PageMeta
        title="Política de privacidade"
        description="Como a KNOW-KNOW trata os seus dados pessoais."
      />
      <p>
        A KNOW-KNOW é um projeto acadêmico de uma startup de troca de conhecimento. Tratamos seus
        dados seguindo os princípios da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018):
        coletamos o mínimo necessário e explicamos para que cada dado serve.
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> e-mail e senha. Eles ficam com o nosso provedor de autenticação
          (Supabase); a senha nunca é armazenada em texto aberto e nunca passa pelo nosso servidor.
        </li>
        <li>
          <strong>Perfil:</strong> nome de exibição, foto (opcional), apresentação (opcional),
          cidade e estado (opcionais, para aulas presenciais), modalidade preferida e fuso horário.
        </li>
        <li>
          <strong>Uso da plataforma:</strong> conhecimentos que você ensina e quer aprender,
          horários disponíveis, aulas solicitadas e realizadas, créditos, avaliações, notificações e
          denúncias.
        </li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>
          Fazer a plataforma funcionar: mostrar seu perfil, sugerir pessoas, agendar e registrar
          aulas.
        </li>
        <li>Garantir confiança: avaliações, reputação e análise de denúncias.</li>
        <li>Segurança: prevenir fraudes e abusos.</li>
      </ul>
      <p>Não vendemos seus dados e não usamos anúncios.</p>

      <h2>O que outras pessoas veem</h2>
      <p>
        Outros usuários logados veem seu nome, foto, apresentação, cidade/estado, conhecimentos,
        horários, reputação e avaliações recebidas. Seu e-mail nunca é exibido. O link de uma aula
        só aparece para você e para a outra pessoa da aula.
      </p>

      <h2>Seus direitos</h2>
      <ul>
        <li>
          Acessar e corrigir seus dados em <em>Perfil → Editar perfil</em>.
        </li>
        <li>
          Excluir sua conta em <em>Configurações</em>: removemos seus dados pessoais e cancelamos
          aulas futuras. Registros financeiros e avaliações já feitas permanecem de forma
          anonimizada, para manter o histórico dos demais participantes consistente.
        </li>
        <li>
          Pedir a portabilidade (exportação) dos seus dados: em desenvolvimento; por enquanto,
          solicite à equipe.
        </li>
        <li>Retirar consentimentos e tirar dúvidas sobre o tratamento dos seus dados.</li>
      </ul>

      <h2>Onde ficam os dados</h2>
      <p>
        Banco de dados, autenticação e arquivos ficam no Supabase; a API roda no Render e o site no
        Cloudflare Pages. Esses provedores atuam como operadores de dados.
      </p>

      <h2>Retenção</h2>
      <p>
        Mantemos seus dados enquanto sua conta existir. Após a exclusão, mantemos apenas o
        necessário para o histórico de créditos e avaliações, sem identificar você.
      </p>

      <p className="text-sm text-fg-muted">
        Este documento é um modelo para o MVP acadêmico e deve ser revisado por um profissional
        jurídico antes de um lançamento comercial.
      </p>
    </LegalLayout>
  );
}
