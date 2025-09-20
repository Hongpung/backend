import { createHmac, randomBytes } from 'crypto';

export function generateOpaqueRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashRefreshToken(
  refreshTokenPlaintext: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(refreshTokenPlaintext, 'utf8')
    .digest('hex');
}
