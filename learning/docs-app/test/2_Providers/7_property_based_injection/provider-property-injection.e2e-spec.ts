import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Injectable()
class CatsDataService {
  findAll(): string[] {
    return ['Milo'];
  }
}

@Injectable()
class CatsService {
  // 测试容器是否把 CatsDataService 实例赋给这个 Provider 属性。
  @Inject(CatsDataService)
  private readonly catsDataService!: CatsDataService;

  findAll(): string[] {
    return this.catsDataService.findAll();
  }
}

@Controller('cats')
class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Get()
  findAll(): string[] {
    return this.catsService.findAll();
  }
}

@Module({
  controllers: [CatsController],
  providers: [CatsDataService, CatsService],
})
class CatsModule {}

describe('Property-based injection between providers', () => {
  it('injects one provider into another provider property', async () => {
    const app = await NestFactory.create(CatsModule);
    await app.init();

    // 得到 Milo，表示 CatsService 的属性依赖已成功注入。
    await request(app.getHttpServer()).get('/cats').expect(200).expect(['Milo']);
  });
});
