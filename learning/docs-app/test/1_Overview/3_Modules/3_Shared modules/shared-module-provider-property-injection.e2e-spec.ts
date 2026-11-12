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

// ---------------------------------ConsumerAModule----------------------------

@Injectable()
class ConsumerAService {
  // ConsumerAService 从导入模块取得计数器，不在本模块重复注册它。
  @Inject(SharedCounterService)
  private readonly counterService!: SharedCounterService;

  next(): number {
    return this.counterService.next();
  }
}

@Controller('provider-consumer-a')
class ConsumerAController {
  constructor(private readonly consumerAService: ConsumerAService) {}

  @Get()
  getCount(): { count: number } {
    return { count: this.consumerAService.next() };
  }
}

@Module({
  imports: [SharedCounterModule],
  controllers: [ConsumerAController],
  providers: [ConsumerAService],
})
class ConsumerAModule {}

//---------------------------------ConsumerBModule----------------------------

@Injectable()
class ConsumerBService {
  @Inject(SharedCounterService)
  private readonly counterService!: SharedCounterService;

  next(): number {
    return this.counterService.next();
  }
}

@Controller('provider-consumer-b')
class ConsumerBController {
  constructor(private readonly consumerBService: ConsumerBService) {}

  @Get()
  getCount(): { count: number } {
    return { count: this.consumerBService.next() };
  }
}

@Module({
  imports: [SharedCounterModule],
  controllers: [ConsumerBController],
  providers: [ConsumerBService],
})
class ConsumerBModule {}

//----------------------------------AppModule----------------------------------

@Module({
  imports: [ConsumerAModule, ConsumerBModule],
})
class AppModule {}

describe('Shared modules with provider property injection', () => {
  it('shares an exported provider instance injected into providers across modules', async () => {
    const app = await NestFactory.create(AppModule);
    await app.init();

    // A 的 ConsumerService 先递增为 1，B 的再递增同一计数器为 2。
    await request(app.getHttpServer()).get('/provider-consumer-a').expect(200).expect({ count: 1 });
    await request(app.getHttpServer()).get('/provider-consumer-b').expect(200).expect({ count: 2 });
  });
});
