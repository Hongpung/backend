import { PartialType } from '@nestjs/mapped-types';
import { CreateReservationDto, ForceCreateReservationDto } from './create-reservation.dto';
import { IsArray, IsInt } from 'class-validator';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
    
    @IsArray()
    @IsInt({ each: true })
    addedParticipatorIds?: number[];

    @IsArray()
    @IsInt({ each: true })
    removedParticipatorIds?: number[];

    @IsArray()
    @IsInt({ each: true })
    addedBorrowInstrumentIds?: number[];

    @IsArray()
    @IsInt({ each: true })
    removedBorrowInstrumentIds?: number[];

}

export class ForceUpdateReservationDto extends PartialType(ForceCreateReservationDto) {
}