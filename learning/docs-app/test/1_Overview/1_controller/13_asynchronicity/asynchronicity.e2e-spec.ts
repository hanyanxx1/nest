import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import request from 'supertest';

@Controller('async')
class AsynchronicityController {
  // Promise 用例验证 Nest 会等待处理器完成后再发送结果。
  @Get('promise')
  async findPromise(): Promise<{ value: string }> {
    return { value: 'resolved' };
  }

  // 多次发值后结束，用来验证响应取流完成前的最后一个值。
  @Get('observable')
  findObservable(): Observable<{ value: string }> {
    return of({ value: 'first' }, { value: 'last' });
  }
}

@Module({ controllers: [AsynchronicityController] })
class AsynchronicityModule {}

describe('Asynchronicity', () => {
  it('resolves a Promise returned by the route handler', async () => {
    const app = await NestFactory.create(AsynchronicityModule);
    await app.init();

    await request(app.getHttpServer()).get('/async/promise').expect(200).expect({ value: 'resolved' });
  });

  it('returns the last value from an Observable after it completes', async () => {
    const app = await NestFactory.create(AsynchronicityModule);
    await app.init();

    await request(app.getHttpServer()).get('/async/observable').expect(200).expect({ value: 'last' });
  });
});
