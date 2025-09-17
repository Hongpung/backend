import { VerifyAdminPasswordDto } from './dto/verify-admin-password.dto';

export abstract class VerifyAdminPasswordUseCase {
  abstract verify(dto: VerifyAdminPasswordDto): Promise<boolean>;
}
