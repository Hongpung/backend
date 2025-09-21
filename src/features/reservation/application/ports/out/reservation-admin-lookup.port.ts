export const ReservationAdminLookupPort = Symbol('ReservationAdminLookupPort');

export interface ReservationAdminLookupPort {
  requireAdmin(adminId: number): Promise<void>;
  requireSuperAdmin(adminId: number): Promise<{ name: string }>;
}
