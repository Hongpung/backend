import { IsIn, IsNumber, IsString } from "class-validator";

export class ChangeAdminDto {
    @IsString()
    @IsIn(['SUPER', 'SUB'])
    adminLevel: string
}
