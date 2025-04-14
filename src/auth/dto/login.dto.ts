import { IsBoolean, IsEmail, IsString } from "class-validator";

export class LoginDto {

    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsBoolean()
    autoLogin?: boolean; // 자동 로그인 여부
}