import { ArrayNotEmpty, IsArray, IsDateString, IsIn, IsInt, IsString, } from 'class-validator';

export class RoleAssignmentDto {

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @IsIn(['상쇠', '패짱', '상장구', '수북', '수법고'], { each: true })
    role: string[];

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
