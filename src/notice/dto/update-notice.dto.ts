import { PartialType } from '@nestjs/mapped-types';
import { CreateNoticeDto } from './create-notice.dto';
import { IsInt } from 'class-validator';

export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {

}
