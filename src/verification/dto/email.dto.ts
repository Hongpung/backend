import { IsEmail, IsInt, IsNumberString, IsString } from 'class-validator';

export class EmailDto {
    @IsEmail()
    email: string;
}

export class VerifyEmailDto extends EmailDto {

    @IsNumberString()
    code: string;
}