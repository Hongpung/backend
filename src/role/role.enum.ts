import { EnRole, KoRole, ROLE_MAP } from './role.type';

/**
 * Role Enum 유틸리티 클래스
 *
 * 공통으로 사용되는 역할 변환 유틸리티입니다.
 * 정적 메서드로 사용할 수 있습니다.
 *
 * @example
 * ```typescript
 * RoleEnum.EnToKo('LEADER'); // '패짱'
 * RoleEnum.KoToEn('패짱'); // 'LEADER'
 * ```
 */
export class RoleEnum {
  public static EnToKo(role: EnRole): KoRole {
    return ROLE_MAP[role];
  }

  public static KoToEn(role: KoRole): EnRole {
    const result = (Object.entries(ROLE_MAP).find(
      ([, ko]) => ko === role,
    )?.[0] ?? null) as EnRole | null;

    if (!result) {
      throw new Error(`Invalid Korean role: ${role}`);
    }

    return result;
  }

  public static getAllEnRoles(): EnRole[] {
    return Object.keys(ROLE_MAP) as EnRole[];
  }

  public static getAllKoRoles(): KoRole[] {
    return Object.values(ROLE_MAP) as KoRole[];
  }

  public static isValidEnRole(role: string): role is EnRole {
    return role in ROLE_MAP;
  }

  public static isValidKoRole(role: string): role is KoRole {
    return Object.values(ROLE_MAP).includes(role as KoRole);
  }
}
