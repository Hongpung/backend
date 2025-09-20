import { IsArray, IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 알림 전송 Request DTO
 */
export class SendNotificationDto {
  @ApiProperty({
    description: '알림을 받을 회원 ID 목록',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  to: number[];

  @ApiProperty({
    description: '알림 제목',
    example: '새로운 알림',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: '알림 내용',
    example: '알림 내용입니다.',
  })
  @IsString()
  text: string;
}
