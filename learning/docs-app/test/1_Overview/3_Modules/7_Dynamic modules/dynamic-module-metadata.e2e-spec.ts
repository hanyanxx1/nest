import { Controller, Get, Injectable, Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

// 当前先在测试中描述动态模块对象的最小形状。
type DynamicModuleFixture = {
  module: Function;
  providers: Function[];
  exports: Function[];
};

// 静态声明的 Provider；动态模块处理时不能丢掉它。
@Injectable()
class StaticFlagsService {
  getSource(): string {
    return 'static';
  }
}

// forRoot() 动态追加的普通类 Provider。
@Injectable()
class RuntimeFlagsService {
  getSource(): string {
    return 'dynamic';
  }
}

// 静态元数据和 forRoot() 返回的动态元数据应合并在同一个模块上下文中。
@Module({
  providers: [StaticFlagsService],
  exports: [StaticFlagsService],
})
class FeatureFlagsModule {
  static forRoot(): DynamicModule {
    return {
      module: FeatureFlagsModule,
      providers: [RuntimeFlagsService],
      exports: [RuntimeFlagsService],
    };
  }
}

// 消费者同时注入静态 Provider 和动态追加的 Provider。
@Controller('dynamic-module')
class AppController {
  constructor(
    private readonly staticFlagsService: StaticFlagsService,
    private readonly runtimeFlagsService: RuntimeFlagsService,
  ) {}

  @Get()
  getSources(): { static: string; dynamic: string } {
    return {
      static: this.staticFlagsService.getSource(),
      dynamic: this.runtimeFlagsService.getSource(),
    };
  }
}

@Module({
  imports: [FeatureFlagsModule.forRoot()],
  controllers: [AppController],
})
class AppModule {}

describe('Dynamic module metadata', () => {
  it('merges dynamic providers with static module metadata', async () => {
    const app = await NestFactory.create(AppModule);

    try {
      await app.init();

      await request(app.getHttpServer())
        .get('/dynamic-module')
        .expect(200)
        .expect({ static: 'static', dynamic: 'dynamic' });
    } finally {
      await app.close();
    }
  });
});
