import { IsBoolean, IsInt, IsString } from "class-validator";

export class CreateNoticeDto {

    @IsInt()
    channel?:number;

    @IsString()
    title:string;

    @IsString()
    content:string;

    @IsBoolean()
    noticeAll?:boolean

}
