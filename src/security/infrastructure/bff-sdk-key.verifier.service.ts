import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class BffSdkKeyVerifierService {
  constructor(private readonly configService: ConfigService) {}

  verify(providedKey: string): boolean {
    const expectedKey = this.configService.get<string>('BFF_SDK_KEY');
    if (!expectedKey?.trim()) {
      throw new Error('BFF_SDK_KEY is not configured');
    }

    return this.secureCompare(providedKey, expectedKey);
  }

  private secureCompare(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
