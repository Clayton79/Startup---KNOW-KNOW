import { Client } from 'pg';
import { E2E } from '../env';

/** Acesso direto ao banco de e2e, só para simular a passagem do tempo (a aula "já terminou"). */
async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: E2E.databaseUrl });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return withClient(async (client) => (await client.query<T>(sql, params)).rows);
}

/** Empurra a aula para o passado (terminou há 1 hora). */
export async function makeSessionPast(sessionId: string): Promise<void> {
  await query(
    `UPDATE sessions
       SET starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour'
     WHERE id = $1`,
    [sessionId],
  );
}

export async function walletOf(displayName: string) {
  const [row] = await query<{ balance: number; held: number }>(
    `SELECT w.balance, w.held FROM wallets w JOIN profiles p ON p.id = w.user_id WHERE p.display_name = $1`,
    [displayName],
  );
  return row;
}
