import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * 기존 클라이언트 호환을 위한 리디렉션 컨트롤러
 * /banners → /banner (308 Permanent Redirect)
 * GET만 리디렉션 (POST/PATCH/DELETE는 body 유실 가능성으로 제외)
 */
@Controller('banners')
export class BannersRedirectController {
  @Get()
  redirectGetAll(@Res() res: Response) {
    res.redirect(HttpStatus.PERMANENT_REDIRECT, '/banner');
  }

  @Get('on-post')
  redirectGetOnPost(@Res() res: Response) {
    res.redirect(HttpStatus.PERMANENT_REDIRECT, '/banner/on-post');
  }
}
