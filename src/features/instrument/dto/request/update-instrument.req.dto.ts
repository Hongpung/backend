import { PartialType } from '@nestjs/swagger';
import { CreateInstrumentReqDto } from './create-instrument.req.dto';
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInstrumentReqDto extends PartialType(
  CreateInstrumentReqDto,
) {
  @ApiProperty({
    description: '대여 가능 여부',
    example: true,
    required: false,
  })
  @IsBoolean()
  borrowAvailable?: boolean;
}
