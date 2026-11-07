import { Controller, Get, Module, Redirect } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class RedirectionController {
  @Get()
  @Redirect('https://nestjs.com', 301)
  findAll(): void {
    // 验证装饰器指定的地址和状态码用于重定向。
  }

  @Get('docs')
  @Redirect('https://docs.nestjs.com')
  getDocs(): void {
    // 验证省略状态码时使用默认值 302。
  }
}

@Module({ controllers: [RedirectionController] })
class RedirectionModule {}

describe('Redirection', () => {
  it('redirects to the decorator URL with the specified status code', async () => {
    const app = await NestFactory.create(RedirectionModule);
    await app.init();

    await request(app.getHttpServer()).get('/cats').expect(301).expect('Location', 'https://nestjs.com');
  });

  it('defaults to 302 when the decorator status code is omitted', async () => {
    const app = await NestFactory.create(RedirectionModule);
    await app.init();

    await request(app.getHttpServer()).get('/cats/docs').expect(302).expect('Location', 'https://docs.nestjs.com');
  });
});
