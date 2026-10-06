import path from 'node:path';
import { config } from 'dotenv';

// Os testes usam o banco `knowknow_test` definido em apps/api/.env.test.
process.env.NODE_ENV = 'test';
config({ path: path.resolve(__dirname, '../.env.test'), override: true, quiet: true });
