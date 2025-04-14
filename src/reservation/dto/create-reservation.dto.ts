import { reservationType } from "@prisma/client"
import { IsArray, IsBoolean, IsDateString, IsInt, IsString } from "class-validator"

export class CreateReservationDto {

    @IsDateString()
    date: string

    @IsString()
    startTime: string

    @IsString()
    endTime: string

    @IsString()
    title: string

    @IsString()
    reservationType: Exclude<reservationType,'EXTERNAL'>

    @IsBoolean()
    participationAvailable: boolean

    @IsArray()
    @IsInt({ each: true })
    participatorIds: number[];

    @IsArray()
    @IsInt({ each: true })
    borrowInstrumentIds: number[];

}

export class CreateExternalReservationDto {

    @IsDateString()
    date: string

    @IsString()
    startTime: string

    @IsString()
    endTime: string

    @IsString()
    title: string

    @IsString({})
    reservationType: 'EXTERNAL'

    @IsBoolean()
    participationAvailable: boolean

    @IsString()
    externalCreatorName: string

    @IsArray()
    @IsInt({ each: true })
    participatorIds: number[];

    @IsArray()
    @IsInt({ each: true })
    borrowInstrumentIds: number[];

}

export class ForceCreateReservationDto {

    @IsDateString()
    date: string

    @IsString()
    startTime: string

    @IsString()
    endTime: string

    @IsString()
    title: string

    @IsString()
    externalCreatorName?:string

    @IsInt()
    creatorId?:number

    @IsString()
    reservationType: reservationType

    @IsBoolean()
    participationAvailable: boolean

}
