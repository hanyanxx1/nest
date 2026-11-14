import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

@Injectable()
class CatsService {
  // 记录框架创建的实例，用于和 Module 收到的实例比较。
  static instance: CatsService | undefined;

  constructor() {
    CatsService.instance = this;
  }
}

@Module({
  providers: [CatsService],
})
class CatsModule {
  // 记录 Module 构造函数实际收到的依赖。
  static injectedCatsService: CatsService | undefined;

  constructor(catsService: CatsService) {
    CatsModule.injectedCatsService = catsService;
  }
}

describe('Module dependency injection', () => {
  it('injects a provider into the module constructor', async () => {
    CatsService.instance = undefined;
    CatsModule.injectedCatsService = undefined;

    const app = await NestFactory.create(CatsModule);

    try {
      await app.init();

      expect(CatsModule.injectedCatsService).toBeInstanceOf(CatsService);
      // 不只验证类型，还验证注入的是 providers 中创建的同一个实例。
      expect(CatsModule.injectedCatsService).toBe(CatsService.instance);
    } finally {
      await app.close();
    }
  });
});
