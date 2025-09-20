export function getRefreshTokenHashSecret(): string {
  const secret = process.env.REFRESH_TOKEN_HASH_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'REFRESH_TOKEN_HASH_SECRET must be set for refresh-token hashing',
    );
  }
  return secret;
}
