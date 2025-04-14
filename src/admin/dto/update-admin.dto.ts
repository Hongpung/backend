import { PartialType } from '@nestjs/mapped-types';
import { ChangeAdminDto } from './change-admin.dto';

export class UpdateAdminDto extends PartialType(ChangeAdminDto) {}
