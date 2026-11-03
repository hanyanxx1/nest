import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestApplication } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class ListenFixtureController {
  // 只用来证明路由已注册，响应内容不重要。
  @Get()
  findAll(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({
  controllers: [ListenFixtureController],
})
class ListenFixtureModule {}

describe('Application startup (listen)', () => {
  let app: NestApplication;

  // listen() 会占用端口，每个测试结束后必须关闭服务。
  afterEach(async () => {
    await app.close();
  });

  // 与 main.ts 一致：只调用 create() 和 listen()，不手动 init()，路由也应已注册。
  it('registers routes when listen() is called without init()', async () => {
    app = await NestFactory.create(ListenFixtureModule);
    // 端口 0 表示由系统分配空闲端口，避免测试间端口冲突。
    await app.listen(0);

    await request(app.getHttpServer()).get('/cats').expect(200).expect({ ok: true });
  });
});
