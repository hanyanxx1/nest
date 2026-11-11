import { createHmac } from 'node:crypto';
import { Controller, Cookies, Get, Module, SignedCookies } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// 测试专用签名密钥；cookie-parser 用它验证签名 Cookie。
const COOKIE_SECRET = 'test-only-cookie-secret';

// 按 cookie-parser 的约定生成签名 Cookie：s:<值>.<HMAC-SHA256 的 base64，去掉末尾 =>。
function signCookie(value: string): string {
  const signature = createHmac('sha256', COOKIE_SECRET).update(value).digest('base64').replace(/=+$/, '');
  return encodeURIComponent(`s:${value}.${signature}`);
}

@Controller('cookies')
class CookiesFixtureController {
  // 不传 name 时，@Cookies() 注入 cookie-parser 解析出的全部 Cookie。
  @Get('all')
  findAll(@Cookies() cookies: Record<string, string>): { cookies: Record<string, string> } {
    return { cookies };
  }

  // 传入 name 时，@Cookies('name') 只提取指定 Cookie。
  @Get('named')
  findNamed(@Cookies('name') name: string): { name: string } {
    return { name };
  }

  // 不传 name 时，@SignedCookies() 注入签名验证通过的全部 Cookie。
  @Get('signed-all')
  findSignedAll(@SignedCookies() signedCookies: Record<string, string>): { signedCookies: Record<string, string> } {
    return { signedCookies };
  }

  // 传入 name 时，@SignedCookies('name') 只提取指定的已验证签名 Cookie。
  @Get('signed-named')
  findSignedNamed(@SignedCookies('name') name: string): { name: string } {
    return { name };
  }
}

@Module({
  controllers: [CookiesFixtureController],
})
class CookiesFixtureModule {}

describe('Request context (@Cookies, @SignedCookies)', () => {
  // 与实际项目一致：用 app.use(cookieParser(secret)) 注册真实 middleware，再 init() 注册路由。
  async function createApp() {
    const app = await NestFactory.create(CookiesFixtureModule);
    app.use(cookieParser(COOKIE_SECRET));
    await app.init();
    return app;
  }

  // 不传 name 时，注入完整的 Cookie 对象。
  it('injects all cookies when @Cookies has no key', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .get('/cookies/all')
      .set('Cookie', ['name=Milo', 'age=3'])
      .expect(200)
      .expect({ cookies: { name: 'Milo', age: '3' } });
  });

  // 传入 name 时，只注入对应的 Cookie 值。
  it('injects a cookie by key', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .get('/cookies/named')
      .set('Cookie', ['name=Milo', 'age=3'])
      .expect(200)
      .expect({ name: 'Milo' });
  });

  // 不传 name 时，只注入签名验证通过的 Cookie，未签名的 age 不应出现。
  it('injects all signed cookies when @SignedCookies has no key', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .get('/cookies/signed-all')
      .set('Cookie', [`name=${signCookie('Milo')}`, 'age=3'])
      .expect(200)
      .expect({ signedCookies: { name: 'Milo' } });
  });

  // 传入 name 时，只注入对应的已验证签名 Cookie 值。
  it('injects a signed cookie by key', async () => {
    const app = await createApp();

    await request(app.getHttpServer())
      .get('/cookies/signed-named')
      .set('Cookie', [`name=${signCookie('Milo')}`, 'age=3'])
      .expect(200)
      .expect({ name: 'Milo' });
  });
});
