import { ApiProperty } from '@nestjs/swagger';

export class DeleteInstrumentResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: 'Instrument deleted successfully',
  })
  message: string;
}
