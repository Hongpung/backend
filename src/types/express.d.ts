// src/types/express.d.ts
import 'express';

declare module 'express' {
  export interface Request {
    user?: { memberId: number, email: string, clubId: number | null };
    verificationToken?: { verifiedEmail: string };
    admin?: { adminId: number, adminRole: string | null }
  }
}