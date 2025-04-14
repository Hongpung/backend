import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { VerifiedTokenGuard } from 'src/guards/verified-token.guard';
import { Request } from 'express';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('인증 API')
@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) { }

    @Post('check-email')
    @ApiOperation({ summary: '이메일 중복 확인', description: '이미 등록된 이메일인지 확인합니다.' })
    @ApiBody({ type: Object, description: '이메일 주소' })
    @ApiResponse({ status: 200, description: '이메일 확인 성공' })
    async isRegisterdEmail(@Body() body: { email: string }) {
        const { email } = body;
        return await this.authService.isRegisterdEmail(email)
    }

    @Post('signup')
    @ApiOperation({ summary: '회원가입 요청', description: '새로운 사용자의 회원가입을 요청합니다.' })
    @ApiBody({ type: SignupDto })
    @ApiResponse({ status: 201, description: '회원가입 요청 성공' })
    async signup(@Body() signupData: SignupDto) {
        return await this.authService.requestSignup(signupData)
    }

    @Post('login')
    @ApiOperation({ summary: '로그인', description: '이메일과 비밀번호로 로그인합니다.' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: '로그인 성공' })
    @ApiResponse({ status: 401, description: '인증 실패' })
    async login(@Body() loginData: LoginDto) {
        console.log('on Login')
        return await this.authService.login(loginData)
    }

    @Post('logout')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '로그아웃', description: '현재 로그인된 사용자를 로그아웃합니다.' })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: '로그아웃 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async logout(@Req() req: Request) {
        console.log('on Logout')
        const { memberId } = req.user
        return await this.authService.logout(memberId)
    }

    @Post('admin/login')
    @ApiOperation({ summary: '관리자 로그인', description: '관리자 계정으로 로그인합니다.' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: '관리자 로그인 성공' })
    @ApiResponse({ status: 401, description: '인증 실패' })
    async adminLogin(@Body() loginData: LoginDto) {
        console.log('on admin Login')
        return await this.authService.adminLogin(loginData)
    }

    @Post('admin/extend-token')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '관리자 토큰 연장', description: '관리자 토큰의 유효기간을 연장합니다.' })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: '토큰 연장 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async adminExtendsToken(@Req() req: Request) {
        const { adminId } = req.admin;
        return await this.authService.adminExtendsToken(adminId)
    }

    @Get('admin/auth-list')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '인증 목록 조회', description: '모든 인증 요청 목록을 조회합니다.' })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: '인증 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async loadAuthList() {
        return await this.authService.authList()
    }

    @Get('admin/signup')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '회원가입 요청 목록 조회', description: '모든 회원가입 요청 목록을 조회합니다.' })
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: '회원가입 요청 목록 조회 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async loadSingupList() {
        return await this.authService.signupList()
    }

    @Post('admin/signup/accept')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '회원가입 승인', description: '선택된 회원가입 요청을 승인합니다.' })
    @ApiBearerAuth()
    @ApiBody({ type: Object, description: '승인할 회원가입 ID 목록' })
    @ApiResponse({ status: 200, description: '회원가입 승인 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async acceptSignup(@Body() authIds: { acceptedSignUpIds: number[] }) {
        console.log(authIds.acceptedSignUpIds)
        return await this.authService.acceptSignUp(authIds.acceptedSignUpIds)
    }

    @Patch('changePW')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '비밀번호 변경', description: '현재 로그인된 사용자의 비밀번호를 변경합니다.' })
    @ApiBearerAuth()
    @ApiBody({ type: Object, description: '현재 비밀번호와 새 비밀번호' })
    @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async changePassword(@Body() body: { currentPassword: string, newPassword: string }, @Req() req: Request) {
        const { memberId: userId } = req.user
        return await this.authService.changePassword({ userId, ...body })
    }

    @Patch('resetPW')
    @UseGuards(VerifiedTokenGuard)
    @ApiOperation({ summary: '비밀번호 재설정', description: '이메일 인증 후 비밀번호를 재설정합니다.' })
    @ApiBody({ type: Object, description: '새 비밀번호' })
    @ApiResponse({ status: 200, description: '비밀번호 재설정 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async resetPassword(@Body() body: { newPassword: string }, @Req() req: Request) {
        const { verifiedEmail } = req.verificationToken
        return await this.authService.resetPassword({ email: verifiedEmail, ...body })
    }

    @Delete('')
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: '회원 탈퇴', description: '현재 로그인된 사용자의 계정을 삭제합니다.' })
    @ApiBearerAuth()
    @ApiBody({ type: Object, description: '비밀번호' })
    @ApiResponse({ status: 200, description: '회원 탈퇴 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    async remove(@Req() req: Request, @Body() body: { password: string }) {
        const { memberId } = req.user
        console.log(body)
        return this.authService.remove(+memberId, body.password);
    }

    @Delete('admin/:id')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: '강제 회원 탈퇴', description: '관리자가 특정 사용자의 계정을 강제로 삭제합니다.' })
    @ApiBearerAuth()
    @ApiParam({ name: 'id', description: '삭제할 사용자의 ID' })
    @ApiBody({ type: Object, description: '관리자 비밀번호' })
    @ApiResponse({ status: 200, description: '강제 회원 탈퇴 성공' })
    @ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
    @ApiResponse({ status: 403, description: '권한이 없는 사용자' })
    async forceRemove(@Param('id') id: string, @Body('password') password: string, @Req() req: Request) {
        const { adminId } = req.admin
        return this.authService.forceRemove({ adminId, password, targetId: +id });
    }

    @Delete('extnernal')
    @ApiOperation({ summary: '외부 인증 삭제', description: '외부에서 인증하여 계정을 삭제합니다.' })
    @ApiBody({ type: Object, description: '이메일과 비밀번호' })
    @ApiResponse({ status: 200, description: '외부 인증 삭제 성공' })
    @ApiResponse({ status: 401, description: '인증 실패' })
    async externalRemove(@Body() authDto: { email: string, password: string }) {
        return this.authService.externalRemove(authDto);
    }
}
