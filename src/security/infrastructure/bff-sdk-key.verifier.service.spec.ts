import { BffSdkKeyVerifierService } from './bff-sdk-key.verifier.service';

describe('BffSdkKeyVerifierService', () => {
  it('동일 SDK 키면 true', () => {
    const configService = {
      get: jest.fn().mockReturnValue('shared-secret'),
    };
    const service = new BffSdkKeyVerifierService(configService as never);

    expect(service.verify('shared-secret')).toBe(true);
  });

  it('다른 SDK 키면 false', () => {
    const configService = {
      get: jest.fn().mockReturnValue('shared-secret'),
    };
    const service = new BffSdkKeyVerifierService(configService as never);

    expect(service.verify('wrong-secret')).toBe(false);
  });
});
