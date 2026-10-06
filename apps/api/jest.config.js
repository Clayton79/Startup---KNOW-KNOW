/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '(src|test)/.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: true }],
  },
  // O cliente Prisma gerado importa "./x.js"; o Jest precisa resolver para o .ts correspondente.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/main.ts'],
};
