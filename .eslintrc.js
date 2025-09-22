const baseRestrictedImportConfig = {
  paths: [
    {
      name: 'src/features/session/domain/runtime/session-manager.service',
      message:
        'Use src/features/session/application/runtime/session-manager.service instead.',
    },
    {
      name: 'src/features/session/domain/ports/session-job.port',
      message:
        'Use src/features/session/application/ports/out/session-job.port instead.',
    },
    {
      name: 'src/features/session/domain/ports/session-cache.port',
      message:
        'Use src/features/session/application/ports/out/session-cache.port instead.',
    },
  ],
  patterns: [
    {
      group: ['**/domain/runtime/session-manager.service'],
      message:
        'Use session application/runtime path instead of domain/runtime shim.',
    },
    {
      group: ['**/domain/ports/session-job.port'],
      message:
        'Use session application/ports/out/session-job.port instead of domain/ports shim.',
    },
    {
      group: ['**/domain/ports/session-cache.port'],
      message:
        'Use session application/ports/out/session-cache.port instead of domain/ports shim.',
    },
    {
      group: ['src/session/**'],
      message:
        'Legacy src/session was removed. Use src/features/session/** only (see AppModule SessionModule).',
    },
  ],
};

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-restricted-imports': ['error', baseRestrictedImportConfig],
  },
  overrides: [
    {
      files: ['src/notification/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            ...baseRestrictedImportConfig,
            patterns: [
              ...baseRestrictedImportConfig.patterns,
              {
                group: ['src/new-notification/**'],
                message:
                  'Do not add cross-dependencies from notification to new-notification.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['src/new-notification/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            ...baseRestrictedImportConfig,
            patterns: [
              ...baseRestrictedImportConfig.patterns,
              {
                group: ['src/notification/**'],
                message:
                  'Do not add cross-dependencies from new-notification to notification.',
              },
            ],
          },
        ],
      },
    },
  ],
};

