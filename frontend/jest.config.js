const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/layout.tsx',
    '!src/app/providers.tsx',
  ],
  coverageThreshold: {
    global: {
      // Seuil global aligné sur le coverage actuel (~8–9%), mais non nul
      branches: 6,
      functions: 7,
      lines: 8,
      statements: 8,
    },
    // Pages et composants critiques : seuils plus élevés
    './src/components/LoginPrompt.tsx': {
      branches: 30,
      functions: 30,
      lines: 50,
      statements: 50,
    },
    './src/components/ProgressTracker.tsx': {
      branches: 20,
      functions: 20,
      lines: 40,
      statements: 40,
    },
    // Composants secondaires : seuils faibles mais non nuls (ajoutés plus tard si nécessaire)
  },
};

module.exports = createJestConfig(customJestConfig);
