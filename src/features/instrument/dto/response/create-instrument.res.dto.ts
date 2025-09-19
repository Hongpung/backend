import { ApiProperty } from '@nestjs/swagger';
import { InstrumentResDto } from './instrument.res.dto';

export class CreateInstrumentResDto extends InstrumentResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: 'Instrument created successfully',
  })
  message: string;
}
