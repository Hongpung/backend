import { BadRequestException, ForbiddenException, Injectable, NotAcceptableException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { comparePassword, hashPassword } from './auth.util';
import { SignupDto } from './dto/signup.dto';
import { RoleEnum } from 'src/role/role.enum';
import { MailService } from 'src/mail/mail.service';
import { Cron } from '@nestjs/schedule';
import { MemberService } from 'src/member/member.service';

@Injectable()
export class AuthService {

    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
        private readonly memberService: MemberService,
        private readonly roleEnum: RoleEnum
    ) { }

    async isRegisterdEmail(email: string) {
        const findMember = await this.prisma.member.findUnique({
            where: { email }
        })
        if (!!findMember) return { isRegistered: true }

        else return { isRegistered: false }
    }

    async requestSignup(signupData: SignupDto) {
        const { email, password, name, enrollmentNumber, clubId, nickname } = signupData

        if (clubId) {

            const club = await this.prisma.club.findUnique({
                where: { clubId }
            })

            if (!club)
                throw new NotFoundException('invalid clubId');

        }

        const hashedPassword = await hashPassword(password);

        await this.prisma.member.create({
            data: {
                email,
                password: hashedPassword,
                name,
                enrollmentNumber,
                clubId,
                nickname
            }
        })

        this.sendSignUpRequestMail()

        return { message: 'SignUp Success' }

    }


    async login(loginData: LoginDto): Promise<{ [key: string]: string | number }> {

        const { email, password, autoLogin } = loginData

        const member = await this.prisma.member.findUnique({
            where: { email },
            include: {
                club: true,      // 클럽 정보 포함
            }
        })

        if (!member)
            throw new UnauthorizedException('Check Email Or Password!');

        const passwordMatchResult = await comparePassword(password, member.password);

        if (!passwordMatchResult)
            throw new UnauthorizedException("Check Email Or Password!");

        if (member.isPermmited != 'ACCEPTED')
            throw new ForbiddenException({ message: "You're not accepted", errorCode: 'USER_NOT_APPROVED' })

        if (autoLogin) {
            const token = await this.jwtService.signAsync(
                { memberId: Number(member.memberId), email, clubId: Number(member.clubId) },
                { expiresIn: '30d' }
            );

            return { token }
        }
        else {
            const token = await this.jwtService.signAsync(
                { memberId: Number(member.memberId), email, clubId: Number(member.clubId) },
                { expiresIn: '1d' }
            );

            return { token }
        }
    }

    async logout(memberId: number) {
        try {
            await this.memberService.updatePushEnable({ memberId, pushEnable: false, notificationToken: null })
            return { message: 'Logout complete!' }
        } catch {
            throw new BadRequestException("Logout failed");
        }
    }

    async adminLogin(loginData: LoginDto): Promise<{ [key: string]: string | number }> {

        const { email, password } = loginData

        const member = await this.prisma.member.findUnique({
            where: {
                email
            },
            include: {
                club: true,      // 클럽 정보 포함
            }
        })

        if (!member)
            throw new UnauthorizedException('Check Email Or Password!');

        const passwordMatchResult = await comparePassword(password, member.password);

        if (!passwordMatchResult)
            throw new UnauthorizedException('Check Email Or Password!');

        if (!member.adminLevel)
            throw new UnauthorizedException("You're not Admin");

        const token = await this.jwtService.signAsync(
            { adminId: member.memberId, adminRole: member.adminLevel },
            { secret: process.env.ADMIN_SECRET_KEY, expiresIn: '1h' }
        );

        return { token }
    }

    async adminExtendsToken(adminId: number): Promise<{ [key: string]: string | number }> {

        const member = await this.prisma.member.findUnique({
            where: {
                memberId: adminId
            },
            include: {
                club: true,      // 클럽 정보 포함
            }
        })

        if (!member)
            throw new NotFoundException('Email information is not exist');

        if (!member.adminLevel)
            throw new UnauthorizedException("You're not Admin");

        const token = await this.jwtService.signAsync(
            { adminId: member.memberId, adminRole: member.adminLevel },
            { secret: process.env.ADMIN_SECRET_KEY, expiresIn: '1h' }
        );

        return { token }
    }

    async changePassword({ userId, currentPassword, newPassword }: { userId: number, currentPassword: string, newPassword: string }) {
        // 토큰 및 기존 비밀번호 입력 받아서 변경
        const member = await this.prisma.member.findUnique({
            where: { memberId: userId },
            select: { password: true }
        })

        if (!member)
            throw new NotFoundException('Email information is not exist');


        const passwordMatchResult = await comparePassword(currentPassword, member.password);


        if (!passwordMatchResult)
            throw new UnauthorizedException('Password is not correct');


        const hashedPassword = await hashPassword(newPassword);

        await this.prisma.member.update({
            where: { memberId: userId },
            data: {
                password: hashedPassword
            }
        })

        return { message: 'Changing password is done' }
    }

    async resetPassword({ email, newPassword }: { email: string, newPassword: string }) {
        // 임의의 토큰 입력 받아서 변경

        const member = await this.prisma.member.findUnique({
            where: { email },
            select: { password: true }
        })

        if (!member)
            throw new NotFoundException('Email information is not exist');

        const hashedPassword = await hashPassword(newPassword);

        await this.prisma.member.update({
            where: { email },
            data: {
                password: hashedPassword
            }
        })

        return { message: 'Reset password is done' }

    }


    async authList() {
        const authList = await this.prisma.member.findMany({
            where: {
                isPermmited: 'ACCEPTED'
            },
            select: {
                memberId: true,
                name: true,
                nickname: true,
                club: { select: { clubName: true } },
                enrollmentNumber: true,
                email: true,
                roleAssignment: { select: { role: true } }
            }
        })

        const formattedList = authList.map(auth => ({
            ...auth,
            club: auth.club?.clubName,
            role: auth.roleAssignment.map(role => this.roleEnum.EnToKo(role.role)),
            roleAssignment: undefined
        }))

        return [...formattedList]
    }

    async signupList() {
        const signupList = await this.prisma.member.findMany({
            where: { isPermmited: 'PENDING' },
            select: {
                memberId: true,
                name: true,
                nickname: true,
                club: { select: { clubName: true } },
                enrollmentNumber: true,
                email: true,
            }
        })

        const formattedList = signupList.map(signUp => ({
            ...signUp,
            signupId: signUp.memberId,
            memberId: undefined,
            club: signUp.club?.clubName,
        }))

        return [...formattedList]

    }

    async acceptSignUp(ids: number[]) {

        await this.prisma.member.updateMany({
            where: { memberId: { in: ids } },
            data: {
                isPermmited: 'ACCEPTED'
            }
        })

        const acceptedUsers = await this.prisma.member.findMany({
            where: { memberId: { in: ids } },
            select: { email: true, name: true }
        })

        Promise.all(acceptedUsers.map(async ({ email, name }) => {
            try {
                await this.mailService.sendSignUpAcceptedMail(email, name);
                console.log(`메일 전송 성공: ${email}`);
            } catch (error) {
                console.error(`메일 전송 실패: ${email}, 에러: ${error.message}`);
            }
        }))

        return { message: 'success' }
    }

    async remove(memberId: number, password: string) {

        const user = await this.prisma.member.findUnique({
            where: { memberId: memberId },
            select: { password: true }
        })

        if (!user) throw new BadRequestException('해당 유저가 존재하지 않습니다.')

        if (!comparePassword(password, user.password)) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

        await this.prisma.member.delete({
            where: { memberId: memberId },
        })

        return { message: 'delete user successfull' }
    }

    async forceRemove({ adminId, password, targetId }: { adminId: number, password: string, targetId: number }) {

        const admin = await this.prisma.member.findUnique({
            where: {
                memberId: adminId,
            },
            select: { password: true, adminLevel: true }
        })

        if (!admin) throw new BadRequestException('해당 유저가 존재하지 않습니다.')

        if (!admin.adminLevel) throw new UnauthorizedException('권한이 없습니다.')

        if (!comparePassword(password, admin.password)) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

        const targetUser = await this.prisma.member.findUnique({
            where: { memberId: targetId },
        })

        if (!targetUser) throw new BadRequestException('해당 유저가 존재하지 않습니다.')

        await this.prisma.member.delete({
            where: { memberId: targetId },
        })

        return { message: 'delete user successfull' }
    }


    async externalRemove({ email, password }: { email: string, password: string }) {

        const requestUser = await this.prisma.member.findUnique({
            where: {
                email: email,
            },
            select: { password: true, memberId: true }
        })

        if (!requestUser) throw new BadRequestException('해당 유저가 존재하지 않습니다.')

        if (!comparePassword(password, requestUser.password)) throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');

        await this.prisma.member.delete({
            where: { memberId: requestUser.memberId },
        })

        return { message: 'delete user successfull' }
    }


    @Cron('0 * * * *') // 매 정각 (매 시간 0분)
    async sendSignUpRequestMail() {

        const emails = await this.prisma.member.findMany({
            where: {
                adminLevel: 'SUPER',
            },
            select: { email: true }
        })

        const signupList = await this.prisma.member.findMany({
            where: { isPermmited: 'PENDING' },
            select: {
                memberId: true
            }
        })

        if (signupList.length > 0)
            for (const { email } of emails)
                this.mailService.sendSignUpRequestedMail(email, signupList.length)
    }
}
