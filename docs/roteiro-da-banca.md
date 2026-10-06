# Roteiro da apresentação

Fluxo de ~8 minutos que mostra o diferencial da KNOW-KNOW: **pessoas transformam o conhecimento
que já têm em oportunidade de aprender algo novo**, e os créditos circulam entre todos
(não é uma troca direta, e não é "mais um site de cursos").

## Antes de começar

1. Suba o ambiente e os dados de demonstração (veja o [README](../README.md#rodando-localmente)).
2. **Acorde a API** (o plano gratuito do Render dorme): abra `https://SUA-API/health` e espere responder.
3. Perfis de demonstração (fictícios, marcados como tal na bio). Para poder **logar** neles, rode o
   seed com `SEED_DEMO_PASSWORD` definida:

| Pessoa                                        | Ensina            | Quer aprender    |
| --------------------------------------------- | ----------------- | ---------------- |
| Ana Ribeiro (`ana@demo.know-know.app`)        | Inglês            | Java             |
| Lucas Ferreira (`lucas@demo.know-know.app`)   | Excel             | Inglês           |
| Marina Duarte (`marina@demo.know-know.app`)   | Design, Photoshop | Excel            |
| Rafael Moreira (`rafael@demo.know-know.app`)  | Java, Git         | Design           |
| Equipe KNOW-KNOW (`admin@demo.know-know.app`) | Oratória          | n/a (administra) |

## Passo a passo

1. **Landing**: Hero, "Como funciona", categorias, o sistema de créditos (a taxa vem da API, não está
   fixa na tela) e a seção de segurança. Mostre no celular também: o menu funciona sem hover.
2. **Criar conta** (`/cadastro`): nome, e-mail, senha e aceite dos termos. Mostre a mensagem de erro
   humana digitando uma senha fraca.
3. **Onboarding** (5 passos, com barra de progresso): "sei ensinar **Java**" → "quero aprender
   **inglês**" → horários (pode pular) → **Perfil concluído**.
4. **Painel**: saldo de **20 créditos** de boas-vindas e, em "Pessoas que podem ensinar o que você
   procura", a **Ana** com o selo **Match excelente — "Vocês podem aprender um com o outro."**
   (você ensina Java e ela quer Java; ela ensina inglês e você quer inglês).
5. **Explorar**: filtre por nível, avaliação, online/presencial, "só com horários". Abra o **perfil**
   da Ana: reputação como "4,x · N avaliações", horários, conhecimentos.
6. **Solicitar aula**: escolha 60 min e um horário **livre** (só aparecem horários dentro da
   disponibilidade dela e fora de aulas já marcadas). O resumo mostra o custo de **10 créditos**.
7. Na carteira, mostre que os 10 créditos ficaram **reservados** (ainda não saíram do saldo).
8. **Entre como Ana**: há uma notificação "Lucas/Clayton gostaria de aprender Inglês com você". Ela pode
   **Aceitar**, **Recusar** ou **Sugerir outro horário**. Aceite informando o link do Meet
   (só os dois participantes veem esse link).
9. **Passe o tempo**: para não esperar a aula acontecer, rode
   `UPDATE sessions SET starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour' WHERE id = '…';`
   (no SQL Editor do Supabase) e recarregue.
10. A Ana responde **"Essa aula aconteceu? Sim"**; depois o aluno também. Os créditos são
    **transferidos de uma vez, uma única vez**: aluno 20 → 10; Ana +10.
11. **Avaliação** pelas estrelas (didática, conhecimento, pontualidade) e comentário.
12. **Carteira**: novo saldo e **histórico** imutável ("Aula de Inglês −10", "Créditos de boas-vindas +20").
13. **Perfil da Ana**: a reputação mudou ("média · quantidade de avaliações").

## Pontos para destacar na conversa

- **Ledger imutável + saldo materializado** na mesma transação; liquidação idempotente (mostre o teste
  `credits.e2e-spec.ts` rodando: confirmações simultâneas liquidam uma vez só).
- **Escrow** de créditos: impossível "gastar o mesmo crédito duas vezes".
- **Regras também no banco**: horários não se sobrepõem (constraint de exclusão), saldo não fica negativo,
  review só de aula concluída (trigger), ledger sem UPDATE/DELETE.
- **Autorização por operação**, não só "está logado": terceiros recebem 404 em aulas alheias; papel admin
  lido do banco.
- **Match determinístico**, explicável e testável, com espaço para evoluir (pesos em constantes).
- **Acessibilidade medida**: axe (WCAG 2.2 AA) rodando nas telas principais; foco gerenciado em diálogos.
- **Testes**: ~200 na API (contra Postgres real), unitários no front e fluxo completo no navegador (Playwright).

## Se algo der errado ao vivo

- Tela "Algo deu errado do nosso lado": a API provavelmente estava dormindo; aguarde ~1 min e recarregue.
- "Falta configurar o ambiente": faltam as variáveis `VITE_*` no deploy do site.
- Login falha com tudo certo: confira no Supabase (Auth → Users) se o e-mail foi confirmado.
