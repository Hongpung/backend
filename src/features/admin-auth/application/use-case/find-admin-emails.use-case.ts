import { Inject, Injectable } from '@nestjs/common';
import {
  AdminAuthRepositoryPort,
  type IAdminAuthRepository,
} from '../ports/out/admin-auth.repository.port';
import { FindAdminEmailsUseCase } from '../ports/in/find-admin-emails.use-case';

@Injectable()
export class FindAdminEmailsService implements FindAdminEmailsUseCase {
  constructor(
    @Inject(AdminAuthRepositoryPort)
    private readonly adminAuthRepository: IAdminAuthRepository,
  ) {}

  async findAdminEmails(): Promise<Array<{ email: string }>> {
    return this.adminAuthRepository.findAdminEmails();
  }
}
