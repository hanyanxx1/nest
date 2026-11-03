import { Controller, Cookies, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import request from 'supertest';

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
}

@Module({
  controllers: [CookiesFixtureController],
})
class CookiesFixtureModule {}

describe('Request context (@Cookies)', () => {
  // 与实际项目一致：用 app.use(cookieParser()) 注册真实 middleware，再 init() 注册路由。
  async function createApp() {
    const app = await NestFactory.create(CookiesFixtureModule);
    app.use(cookieParser());
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
});
