import { describe, expect, it } from '@jest/globals';
import { AdminControllerRequestMapper } from './admin-controller.request.mapper';

describe('AdminControllerRequestMapper', () => {
  it('CreateAdminReqDto의 adminLevel을 그대로 반환한다', () => {
    expect(
      AdminControllerRequestMapper.toAdminLevelFromCreate({
        adminLevel: 'SUPER',
      }),
    ).toBe('SUPER');
  });

  it('ChangeAdminReqDto의 adminLevel을 그대로 반환한다', () => {
    expect(
      AdminControllerRequestMapper.toAdminLevelFromChange({
        adminLevel: 'SUB',
      }),
    ).toBe('SUB');
  });
});
