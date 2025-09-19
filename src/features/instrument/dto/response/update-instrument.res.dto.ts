import { ApiProperty } from '@nestjs/swagger';
import { InstrumentResDto } from './instrument.res.dto';

export class UpdateInstrumentResDto extends InstrumentResDto {
  @ApiProperty({
    description: '응답 메시지',
    example: 'Instrument updated successfully',
  })
  message: string;
}
