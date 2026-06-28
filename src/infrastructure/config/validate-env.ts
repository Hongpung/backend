const REQUIRED_PRODUCTION_ENV = [
  'DATABASE_URL',
  'SECRET_KEY',
  'ADMIN_SECRET_KEY',
  'VERIFIED_SECRET_KEY',
  'REFRESH_TOKEN_HASH_SECRET',
  'REDIS_HOST',
  'REDIS_PORT',
] as const;

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (
    config.NODE_ENV !== 'production' ||
    config.INTEGRATION_TEST ||
    config.E2E_TEST
  ) {
    return config;
  }

  const missing = REQUIRED_PRODUCTION_ENV.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return config;
}
