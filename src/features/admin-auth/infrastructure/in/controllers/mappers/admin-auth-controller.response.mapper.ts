import type { TokenResDto } from '../../dto/response/token.res.dto';

export class AdminAuthControllerResponseMapper {
  static toTokenResDto(result: { token: string }): TokenResDto {
    return { token: result.token };
  }
}
