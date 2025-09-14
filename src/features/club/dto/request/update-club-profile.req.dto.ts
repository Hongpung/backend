import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { RoleEnum } from 'src/role/role.enum';
import type { KoRole } from 'src/role/role.type';

const normalizeUrl = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed === '') return trimmed;

  try {
    return encodeURI(trimmed);
  } catch {
    return trimmed;
  }
};

export class UpdateClubRoleAssignmentItemReqDto {
  @ApiProperty({
    description: '역할명 (한글)',
    example: '패짱',
    enum: RoleEnum.getAllKoRoles(),
  })
  @IsIn(RoleEnum.getAllKoRoles())
  role!: KoRole;

  @ApiProperty({
    description: '사용자 ID (null이면 역할 해제)',
    nullable: true,
    example: null,
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  userId!: number | null;
}

export class UpdateClubProfileReqDto {
  @ApiProperty({
    description: '동아리 프로필 이미지 URL',
    nullable: true,
  })
  @Transform(({ value }) => normalizeUrl(value))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUrl()
  profileImageUrl?: string | null;

  @ApiProperty({
    description: '역할별 사용자 ID 할당 목록',
    type: [UpdateClubRoleAssignmentItemReqDto],
    example: [
      { role: '패짱', userId: 1 },
      { role: '상쇠', userId: null },
    ],
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateClubRoleAssignmentItemReqDto)
  roleAssignments?: UpdateClubRoleAssignmentItemReqDto[] | null;
}
