import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

//---------------------------------SharedCounterModule----------------------------

// 递增计数让不同消费者是否共用同一个 Service 实例变得可观察。
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

@Controller('consumer-a')
class ConsumerAController {
  constructor(private readonly counterService: SharedCounterService) {}

  @Get()
  getCount(): { count: number } {
    return { count: this.counterService.next() };
  }
}

// 消费者只导入共享模块，不在自己的 providers 里重复注册 Service。
@Module({
  imports: [SharedCounterModule],
  controllers: [ConsumerAController],
})
class ConsumerAModule {}

//---------------------------------ConsumerBModule----------------------------

@Controller('consumer-b')
class ConsumerBController {
  constructor(private readonly counterService: SharedCounterService) {}

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

//---------------------------------AppModule----------------------------

@Module({
  imports: [ConsumerAModule, ConsumerBModule],
})
class AppModule {}

describe('Shared modules', () => {
  it('shares one exported provider instance across importing modules', async () => {
    const app = await NestFactory.create(AppModule);
    await app.init();

    // A 得到 1、B 接着得到 2，说明两个模块使用同一个计数器实例。
    await request(app.getHttpServer()).get('/consumer-a').expect(200).expect({ count: 1 });
    await request(app.getHttpServer()).get('/consumer-b').expect(200).expect({ count: 2 });
  });
});
