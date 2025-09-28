import { ApiProperty } from '@nestjs/swagger';

export class LiveActivityMyResDto {
  @ApiProperty({
    description:
      '활성 Live Activity가 연결된 세션 식별자 목록 (숫자 또는 문자열 혼합 가능)',
    isArray: true,
    example: [101, 'session-abc'],
  })
  sessionIds: Array<number | string>;
}
