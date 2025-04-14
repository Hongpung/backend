import { PartialType } from '@nestjs/mapped-types';
import { CreateInstrumentDto } from './create-instrument.dto';
import { IsBoolean } from 'class-validator';

export class UpdateInstrumentDto extends PartialType(CreateInstrumentDto) {
    
    @IsBoolean()
    borrowAvailable?:boolean;
    
}
