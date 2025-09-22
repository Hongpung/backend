import 'express';
import type {
  AdminTokenPayload,
  MemberTokenPayload,
  VerifiedTokenPayload,
} from 'src/security/domain';

declare module 'express' {
  export interface Request {
    user?: MemberTokenPayload;
    verificationToken?: VerifiedTokenPayload;
    admin?: AdminTokenPayload;
  }
}
