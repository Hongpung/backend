import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminAuthEntity } from '../domain/admin-auth.entity';

@Injectable()
export class AdminAuthCredentialService {
  async verifyAdminCredentials(
    entity: AdminAuthEntity | null,
    password: string,
  ): Promise<boolean> {
    if (!entity || !entity.isAdmin()) {
      return false;
    }
    return bcrypt.compare(password, entity.password);
  }

  async assertAdminLogin(
    entity: AdminAuthEntity | null,
    password: string,
  ): Promise<AdminAuthEntity> {
    if (!entity) {
      throw new UnauthorizedException('Check Email Or Password!');
    }

    const passwordMatch = await bcrypt.compare(password, entity.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Check Email Or Password!');
    }

    if (!entity.isAdmin()) {
      throw new UnauthorizedException("You're not Admin");
    }

    return entity;
  }
}
