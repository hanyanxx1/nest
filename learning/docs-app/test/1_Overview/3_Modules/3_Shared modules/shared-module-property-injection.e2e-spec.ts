import { Controller, Get, Inject, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

//---------------------------------SharedCounterModule----------------------------

@Injectable()
class SharedCounterService {
  private count = 0;

  next(): number {
    this.count += 1;
    return this.count;
  }
}

@Module({
  providers: [SharedCounterService],
  exports: [SharedCounterService],
})
class SharedCounterModule {}

//---------------------------------ConsumerAModule----------------------------

@Controller('property-consumer-a')
class ConsumerAController {
  // 通过属性装饰器请求共享模块导出的计数器。
  @Inject(SharedCounterService)
  private readonly counterService!: SharedCounterService;

  @Get()
  getCount(): { count: number } {
    return { count: this.counterService.next() };
  }
}

@Module({
  imports: [SharedCounterModule],
  controllers: [ConsumerAController],
})
class ConsumerAModule {}

//---------------------------------ConsumerBModule----------------------------

@Controller('property-consumer-b')
class ConsumerBController {
  @Inject(SharedCounterService)
  private readonly counterService!: SharedCounterService;

  @Get()
  getCount(): { count: number } {
    return { count: this.counterService.next() };
  }
}

@Module({
  imports: [SharedCounterModule],
  controllers: [ConsumerBController],
})
class ConsumerBModule {}

//----------------------------------AppModule----------------------------------

@Module({
  imports: [ConsumerAModule, ConsumerBModule],
})
class AppModule {}

describe('Shared modules with property injection', () => {
  it('shares one exported provider instance across importing modules', async () => {
    const app = await NestFactory.create(AppModule);
    await app.init();

    // A 得到 1、B 接着得到 2，验证属性注入拿到的是同一个实例。
    await request(app.getHttpServer()).get('/property-consumer-a').expect(200).expect({ count: 1 });
    await request(app.getHttpServer()).get('/property-consumer-b').expect(200).expect({ count: 2 });
  });
});
