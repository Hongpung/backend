import type { AdminLoginReqDto } from '../../dto/request/login.req.dto';

export class AdminAuthControllerRequestMapper {
  static toLoginParams(dto: AdminLoginReqDto): {
    email: string;
    password: string;
  } {
    return { email: dto.email, password: dto.password };
  }
}
