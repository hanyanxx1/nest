import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('state-sharing')
class StateSharingController {
  private requestCount = 0;

  // 每个请求递增实例状态，用连续请求观察控制器实例是否共享。
  @Get('count')
  getCount(): { requestCount: number } {
    this.requestCount += 1;
    return { requestCount: this.requestCount };
  }
}

@Module({ controllers: [StateSharingController] })
class StateSharingModule {}

describe('State sharing', () => {
  it('reuses the controller instance across requests in one application', async () => {
    const app = await NestFactory.create(StateSharingModule);
    await app.init();

    const server = app.getHttpServer();

    await request(server).get('/state-sharing/count').expect(200).expect({ requestCount: 1 });
    await request(server).get('/state-sharing/count').expect(200).expect({ requestCount: 2 });
  });
});
