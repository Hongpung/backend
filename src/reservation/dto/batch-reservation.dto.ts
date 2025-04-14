import { reservationType } from "@prisma/client";
import { IsArray, IsDefined, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

type batchReservationOptions<T extends reservationType> = {
  title: string;
  reservationType: T;
} & (T extends 'EXTERNAL' ? { creatorName: string, creatorId?: undefined } : { creatorName?: undefined, creatorId: number });

export class BatchReservtionDTO<T extends reservationType> {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateDetailsDTO)
  dayTimes: { day: string; startTime: string; endTime: string }[];

  @ValidateNested()
  @Type(() => DurationDTO)
  duration: { startDate: string; endDate: string };

  @ValidateNested()
  @Type(() => BatchReservationOptionDTO)
  batchReservationOption: batchReservationOptions<T>;
}

class DateDetailsDTO {
  @IsString()
  @IsIn(['월', '화', '수', '목', '금', '토', '일'])
  day: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

class DurationDTO {
  @IsString()
  startDate: string;

  @IsString()
  endDate: string;
}

class BatchReservationOptionDTO {
  @IsString()
  title: string;

  @IsString()
  reservationType: reservationType;

  @IsOptional()
  @IsString()
  creatorName?: string;

  @IsOptional()
  @IsDefined()
  creatorId?: number;
}