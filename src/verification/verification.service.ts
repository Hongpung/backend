import { Inject, Injectable, } from '@nestjs/common';
import { EmailDto, VerifyEmailDto } from './dto/email.dto'
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';


@Injectable()
export class VerificationService {

  constructor(
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) { }

  async sendEmailVerificationCode(emailDto: EmailDto) {
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const email = emailDto.email

    await this.mailService.sendEmailConfirmMail(email, verificationCode);
    await this.cacheManager.set(email, verificationCode, 3600);

  }

  async verifyEmailVerificationCodeMethod(verifyEmailDto: { email: string, code: string }) {
    const { email, code } = verifyEmailDto;

    const correctCode = await this.cacheManager.get<number>(email);

    if (!correctCode)
      throw Error('Expired Code')

    if (correctCode != +code) {
      console.log('틀린 숫자')
      throw Error('Incorrect Code')
    }

    this.cacheManager.del(email);

    return { message: 'Success' };

  }

  async sendPasswordVerificationCode(emailDto: EmailDto) {

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const email = emailDto.email

    await this.mailService.sendPasswordModifyMail(email, verificationCode);
    await this.cacheManager.set(email, verificationCode, 3600 );

  }

  async verifyPasswordVerificationCode(verifyEmailDto: VerifyEmailDto) {
    
    const { email, code } = verifyEmailDto;

    const correctCode = await this.cacheManager.get<number>(email);

    if (!correctCode)
      throw Error('Expired Code')

    if (correctCode != +code) {
      console.log('틀린 숫자')
      throw Error('Incorrect Code')
    }

    this.cacheManager.del(email);

    return { message: 'Success' };

  }

  async issueVerficationToken(verifyEmailDto: VerifyEmailDto) {
    const { email } = verifyEmailDto;
    const token = await this.jwtService.signAsync({ verifiedEmail: email }, { expiresIn: '5m' })
    return token;
  }
}
