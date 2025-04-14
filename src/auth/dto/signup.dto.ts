import { IsEmail, IsIn, IsInt, IsNumberString, IsString, Length, Max } from "class-validator";

export class SignupDto {

    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsInt()
    @Max(3)
    clubId?: number

    @IsNumberString()
    @Length(2)
    enrollmentNumber: string

    @IsString()
    name:string

    @IsString()
    nickname?:string
}