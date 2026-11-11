import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Injectable()
class CatsService {
  findAll(): string[] {
    return ['Milo'];
  }
}

@Controller('cats')
class CatsController {
  // 控制器把请求处理委托给注入的服务。
  constructor(private readonly catsService: CatsService) {}

  @Get()
  findAll(): string[] {
    return this.catsService.findAll();
  }
}

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
class CatsModule {}

describe('Providers', () => {
  it('injects a registered provider into a controller', async () => {
    const app = await NestFactory.create(CatsModule);
    await app.init();

    // 用 HTTP 响应确认服务已注册、注入并被控制器调用。
    await request(app.getHttpServer()).get('/cats').expect(200).expect(['Milo']);
  });
});
