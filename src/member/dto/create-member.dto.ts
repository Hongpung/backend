import { IsBoolean, IsEmail, IsString } from "class-validator";

export class CreateMemberDto {

    @IsString()
    memberId: number;

    @IsEmail()
    email: string;

    @IsBoolean()
    pushEnable: boolean;
    
    @IsString()
    nickname?: string
    
    @IsString()
    profileImageUrl?: string
    
    @IsString()
    notificationToken?: string;

    @IsString()
    instagramUrl?: string;

    @IsString()
    blogUrl?: string;

}

// export class CreateBannerDto {

//     @IsString()
//     creatorName: string;

//     @IsString()
//     bannerImageUrl: string;

//     @IsString()
//     href?: string;

//     @IsDateString({ strict: true }, { message: 'endDate must be a valid ISO 8601 date string' })
//     startDate: string;

//     @IsDateString({ strict: true }, { message: 'endDate must be a valid ISO 8601 date string' })
//     endDate: string;

// }
