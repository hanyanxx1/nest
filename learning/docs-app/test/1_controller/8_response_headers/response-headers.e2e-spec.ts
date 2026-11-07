import { Controller, Header, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class ResponseHeadersController {
  // 装饰器应添加响应头，同时保留标准响应流程。
  @Post()
  @Header('Cache-Control', 'no-store')
  create(): string {
    return 'This action adds a new cat';
  }
}

@Module({ controllers: [ResponseHeadersController] })
class ResponseHeadersModule {}

describe('Response headers', () => {
  it('sets a method-level header and keeps the standard response', async () => {
    const app = await NestFactory.create(ResponseHeadersModule);
    await app.init();

    await request(app.getHttpServer())
      .post('/cats')
      .expect(201)
      .expect('Cache-Control', 'no-store')
      .expect('This action adds a new cat');
  });
});
