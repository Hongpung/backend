/** ORM/SDK 없이 persistence 클라이언트 에러를 식별 (예: Prisma). */

export function isPersistenceValidationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'PrismaClientValidationError'
  );
}

export function isPersistenceRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2025'
  );
}
