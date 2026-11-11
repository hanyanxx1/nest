import { Controller, HttpCode, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class StatusCodeController {
  // @HttpCode 覆盖 POST 默认的 201，使用官方示例中的无内容状态码。
  @Post()
  @HttpCode(204)
  create(): string {
    return 'This action adds a new cat';
  }
}

@Module({ controllers: [StatusCodeController] })
class StatusCodeModule {}

describe('Status code', () => {
  it('uses the status code specified by @HttpCode instead of POST default 201', async () => {
    const app = await NestFactory.create(StatusCodeModule);
    await app.init();

    await request(app.getHttpServer()).post('/cats').expect(204);
  });
});
