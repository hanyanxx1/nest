import { Controller, Cookies, Get, Res, SignedCookies } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';

@Controller('demo')
export class CookieDemoController {
  // 模拟登录：服务端给浏览器发一个签名 Cookie（signed: true 会用 cookieParser 的密钥签名）。
  @Get('login')
  login(@Res({ passthrough: true }) response: ExpressResponse): { message: string } {
    response.cookie('role', 'admin', { signed: true });
    return { message: 'role=admin 已作为签名 Cookie 发出' };
  }

  // 同时返回普通 Cookie 和已验证签名的 Cookie，对比两者的差别。
  @Get('whoami')
  whoami(
    @Cookies() cookies: Record<string, string>,
    @SignedCookies() signedCookies: Record<string, string>,
  ): { cookies: Record<string, string>; signedCookies: Record<string, string> } {
    return { cookies, signedCookies };
  }
}
