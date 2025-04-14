import { PartialType } from '@nestjs/mapped-types';
import { CreateMemberDto } from './create-member.dto';
import { IsBoolean, IsEmail, IsString } from 'class-validator';

export class UpdateMemberDto extends PartialType(CreateMemberDto) {

    @IsBoolean()
    pushEnable: boolean;

}
