import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces';
import {
  BFF_SDK_KEY_HEADER,
  BffServiceAuthGuard,
} from './bff-service-auth.guard';
import { BffSdkKeyVerifierService } from '../../infrastructure/bff-sdk-key.verifier.service';

describe('BffServiceAuthGuard', () => {
  const verifier = {
    verify: jest.fn(),
  } as unknown as BffSdkKeyVerifierService;

  const guard = new BffServiceAuthGuard(verifier);

  const createContext = (headers: Record<string, string>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('유효한 SDK 키면 통과한다', () => {
    (verifier.verify as jest.Mock).mockReturnValue(true);

    expect(
      guard.canActivate(
        createContext({ [BFF_SDK_KEY_HEADER]: 'fixed-sdk-key' }),
      ),
    ).toBe(true);
    expect(verifier.verify).toHaveBeenCalledWith('fixed-sdk-key');
  });

  it('SDK 키 헤더가 없으면 401', () => {
    expect(() => guard.canActivate(createContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('검증 실패 시 401', () => {
    (verifier.verify as jest.Mock).mockReturnValue(false);

    expect(() =>
      guard.canActivate(createContext({ [BFF_SDK_KEY_HEADER]: 'wrong-key' })),
    ).toThrow(UnauthorizedException);
  });
});
