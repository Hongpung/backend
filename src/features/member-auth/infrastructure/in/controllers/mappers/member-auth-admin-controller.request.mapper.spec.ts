import { describe, expect, it } from '@jest/globals';
import { MemberAuthAdminControllerRequestMapper } from './member-auth-admin-controller.request.mapper';

describe('MemberAuthAdminControllerRequestMapper', () => {
  it('toAcceptedSignupIds는 acceptedSignUpIds를 반환한다', () => {
    expect(
      MemberAuthAdminControllerRequestMapper.toAcceptedSignupIds({
        acceptedSignUpIds: [10, 20],
      } as never),
    ).toEqual([10, 20]);
  });

  it('toForceRemoveParams는 admin·target·password를 조합한다', () => {
    expect(
      MemberAuthAdminControllerRequestMapper.toForceRemoveParams(1, 99, {
        password: 'admin-pw',
      } as never),
    ).toEqual({
      adminId: 1,
      password: 'admin-pw',
      targetId: 99,
    });
  });
});
