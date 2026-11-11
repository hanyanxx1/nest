import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common';
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
  // 依赖不从构造函数传入；测试应用是否能把服务赋给这个属性。
  @Inject(CatsService)
  private readonly catsService!: CatsService;

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

describe('Property-based injection', () => {
  it('injects a registered provider into a controller property', async () => {
    const app = await NestFactory.create(CatsModule);
    await app.init();

    // 收到服务返回的 Milo，说明控制器属性已被正确赋值。
    await request(app.getHttpServer()).get('/cats').expect(200).expect(['Milo']);
  });
});
