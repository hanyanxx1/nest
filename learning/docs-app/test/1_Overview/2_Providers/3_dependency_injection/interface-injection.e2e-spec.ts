import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

interface CatsServiceContract {
  findAll(): string[];
}

@Injectable()
class CatsService implements CatsServiceContract {
  findAll(): string[] {
    return ['Milo'];
  }
}

@Controller('cats')
class CatsController {
  // 这里用 interface 声明依赖，运行时不会保留这个类型。
  constructor(private readonly catsService: CatsServiceContract) {}

  @Get()
  findAll(): string[] {
    return this.catsService.findAll();
  }
}

@Module({
  controllers: [CatsController],
  // 模块登记的是实现该 interface 的具体 class。
  providers: [CatsService],
})
class CatsModule {}

describe('Dependency injection (interface types)', () => {
  it('fails when an interface does not provide a runtime injection token', async () => {
    const app = await NestFactory.create(CatsModule);

    // 初始化时，学习版会用运行时的 Object 类型查找 Provider，因而解析失败。
    await expect(app.init()).rejects.toThrow('CatsController 依赖的 Object 未在 providers 中注册');
  });
});
