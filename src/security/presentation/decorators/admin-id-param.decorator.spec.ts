import { UnauthorizedException } from '@nestjs/common';
import { resolveAdminId } from './admin-id-param.decorator';

describe('resolveAdminId', () => {
  it('admin payload가 있으면 adminId를 반환한다', () => {
    expect(
      resolveAdminId({
        admin: { adminId: 42, adminRole: 'SUPER', clubId: 1 },
      }),
    ).toBe(42);
  });

  it('admin payload가 없으면 401', () => {
    expect(() => resolveAdminId({})).toThrow(UnauthorizedException);
  });
});
