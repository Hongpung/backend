import { Inject, Injectable } from '@nestjs/common';
import { AdminLevelLookupUseCase } from 'src/features/admin/application/ports/in/admin-level-lookup.use-case';
import { ReservationAdminLookupPort } from 'src/features/reservation/application/ports/out/reservation-admin-lookup.port';

@Injectable()
export class ReservationAdminLookupAdapter
  implements ReservationAdminLookupPort
{
  constructor(
    @Inject(AdminLevelLookupUseCase)
    private readonly adminLevelLookupUseCase: AdminLevelLookupUseCase,
  ) {}

  async requireAdmin(adminId: number): Promise<void> {
    return this.adminLevelLookupUseCase.assertIsAdmin(adminId);
  }

  async requireSuperAdmin(adminId: number): Promise<{ name: string }> {
    return this.adminLevelLookupUseCase.assertIsSuperAdmin(adminId);
  }
}
