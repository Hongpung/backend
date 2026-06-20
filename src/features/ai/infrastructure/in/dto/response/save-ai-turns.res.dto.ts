import { ApiProperty } from '@nestjs/swagger';
import { AiUsageCheckResDto } from './ai-usage-check.res.dto';

export class SaveAiTurnsResDto {
  @ApiProperty({ example: true })
  ok: true;

  @ApiProperty({
    type: [String],
    example: ['turn-id-1', 'turn-id-2'],
  })
  turnIds: string[];

  @ApiProperty({
    type: AiUsageCheckResDto,
    description: 'turn 저장 직후 재집계한 월간 usage 스냅샷',
  })
  usage: AiUsageCheckResDto;
}
