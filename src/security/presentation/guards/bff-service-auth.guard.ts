import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { BffSdkKeyVerifierService } from '../../infrastructure/bff-sdk-key.verifier.service';

export const BFF_SDK_KEY_HEADER = 'x-bff-sdk-key';

@Injectable()
export class BffServiceAuthGuard implements CanActivate {
  constructor(private readonly bffSdkKeyVerifier: BffSdkKeyVerifierService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const sdkKey = this.extractSdkKey(request);

    if (!sdkKey) {
      throw new UnauthorizedException('BFF SDK key is required');
    }

    try {
      if (!this.bffSdkKeyVerifier.verify(sdkKey)) {
        throw new UnauthorizedException('Invalid BFF SDK key');
      }
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid BFF SDK key');
    }
  }

  private extractSdkKey(request: Request): string | undefined {
    const headerValue = request.headers[BFF_SDK_KEY_HEADER];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }

    return undefined;
  }
}
