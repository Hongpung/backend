import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';

export const E2E_MEMBER_EMAIL = 'e2e-smoke@ci.hongpung.test';
export const E2E_MEMBER_PASSWORD = 'E2eTestPass1!';
export const E2E_DEVICE_ID = '550e8400-e29b-41d4-a716-446655440099';

export async function seedE2eMember(prisma: PrismaClient): Promise<number> {
  const passwordHash = await bcrypt.hash(E2E_MEMBER_PASSWORD, 10);

  const member = await prisma.member.upsert({
    where: { email: E2E_MEMBER_EMAIL },
    create: {
      email: E2E_MEMBER_EMAIL,
      password: passwordHash,
      name: 'E2E Smoke',
      enrollmentNumber: 'e2e-smoke-001',
      isPermmited: 'ACCEPTED',
    },
    update: {
      password: passwordHash,
      isPermmited: 'ACCEPTED',
    },
  });

  return member.memberId;
}

export async function cleanupE2eMember(
  prisma: PrismaClient,
  memberId: number,
): Promise<void> {
  await prisma.memberRefreshToken.deleteMany({ where: { memberId } });
  await prisma.memberDevice.deleteMany({ where: { memberId } });
  await prisma.member.deleteMany({ where: { memberId } });
}
