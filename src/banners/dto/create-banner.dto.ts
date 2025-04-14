import { IsDateString, IsString, } from 'class-validator';

export class CreateBannerDto {

    @IsString()
    owner: string;

    @IsString()
    bannerImgUrl: string;

    @IsString()
    href?: string;

    @IsDateString({ strict: true }, { message: 'endDate must be a valid ISO 8601 date string' })
    startDate: string;

    @IsDateString({ strict: true }, { message: 'endDate must be a valid ISO 8601 date string' })
    endDate: string;

}

// import { IsEmail, IsString, MinLength } from 'class-validator';

// export class CreateAuthDto {
//     @IsEmail()
//     email: string;

//     @IsString()
//     @MinLength(1)
//     nickname: string;

//     @IsString()
//     @MinLength(8)
//     password: string;
// }
