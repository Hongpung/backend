export class RefreshTokenRotationFailedError extends Error {
  constructor() {
    super('Refresh token rotation failed');
    this.name = 'RefreshTokenRotationFailedError';
  }
}
