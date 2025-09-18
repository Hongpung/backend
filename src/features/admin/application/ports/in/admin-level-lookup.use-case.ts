export abstract class AdminLevelLookupUseCase {
  abstract assertIsAdmin(memberId: number): Promise<void>;
  abstract assertIsSuperAdmin(memberId: number): Promise<{ name: string }>;
}
