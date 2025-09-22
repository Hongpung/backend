import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionLogResDto } from './session-log.res.dto';

export class SessionLogDetailResDto extends SessionLogResDto {
  @ApiProperty({ description: '연장 횟수', example: 0 })
  extendCount: number;

  @ApiPropertyOptional({
    description: '반납 이미지 URL',
    nullable: true,
    type: Object,
  })
  returnImageUrl: unknown;

  @ApiPropertyOptional({ description: '예약 ID', example: 10, nullable: true })
  reservationId: number | null;

  @ApiProperty({ description: '출석 목록', type: [Object] })
  attendanceList: unknown[];

  @ApiProperty({ description: '대여 악기 목록', type: [Object] })
  borrowInstruments: unknown[];
}
