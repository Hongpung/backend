import { PartialType } from '@nestjs/swagger';
import { CreateNoticeReqDto } from './create-notice.req.dto';

export class UpdateNoticeReqDto extends PartialType(CreateNoticeReqDto) {}
