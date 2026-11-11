import { Controller, Get, Module, Optional } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

class CatsService {
  findAll(): string[] {
    return ['Milo'];
  }
}

@Controller('cats')
class CatsController {
  // CatsService 故意不登记在模块中；Optional 应让这里收到 undefined。
  constructor(@Optional() private readonly catsService: CatsService) {}

  @Get()
  findAll(): string[] {
    return this.catsService?.findAll() ?? ['fallback'];
  }
}

@Module({
  controllers: [CatsController],
  providers: [],
})
class CatsModule {}

describe('Optional providers', () => {
  it('uses the controller fallback when the optional provider is missing', async () => {
    const app = await NestFactory.create(CatsModule);
    await app.init();

    // 应用应能启动；缺少服务时，控制器使用自己的默认结果。
    await request(app.getHttpServer()).get('/cats').expect(200).expect(['fallback']);
  });
});
