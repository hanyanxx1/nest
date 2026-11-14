import { Controller, Get, Global, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

//---------------------------------GlobalCatsModule---------------------------------

@Injectable()
class CatsService {
  getMessage(): { source: string } {
    return { source: 'GlobalCatsModule' };
  }
}

// 根模块注册一次；消费者不需要显式导入它，但它仍只公开 exports 中的 Provider。
@Global()
@Module({
  providers: [CatsService],
  exports: [CatsService],
})
class GlobalCatsModule {}

//---------------------------------ConsumerModule---------------------------------

@Controller('consumer')
class ConsumerController {
  constructor(private readonly catsService: CatsService) {}

  @Get()
  getMessage(): { source: string } {
    return this.catsService.getMessage();
  }
}

// 关键验证点：ConsumerModule 没有导入 GlobalCatsModule。
@Module({
  controllers: [ConsumerController],
})
class ConsumerModule {}

//---------------------------------AppModule---------------------------------

@Module({
  imports: [GlobalCatsModule, ConsumerModule],
})
class AppModule {}

describe('Global modules', () => {
  it('makes an exported provider available without importing its module', async () => {
    const app = await NestFactory.create(AppModule);

    try {
      await app.init();

      await request(app.getHttpServer()).get('/consumer').expect(200).expect({ source: 'GlobalCatsModule' });
    } finally {
      await app.close();
    }
  });
});
