import { toDomainOrNull } from 'src/common/persistence/prisma-mapper.util';
import { MemberAuthEntity } from '../../../../domain/member-auth.entity';

export class MemberAuthPrismaMapper {
  static toDomain(data: {
    memberId: number;
    email: string;
    password: string;
  }): MemberAuthEntity {
    return new MemberAuthEntity(data.memberId, data.email, data.password);
  }

  static toDomainOrNull(
    data: {
      memberId: number;
      email: string;
      password: string;
    } | null,
  ): MemberAuthEntity | null {
    return toDomainOrNull(data, MemberAuthPrismaMapper.toDomain);
  }
}
