import { Controller, Get, Module, Next } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { NextFunction } from 'express';

@Controller('cats')
class NextFixtureController {
  // next('route') 跳过当前处理方法，交由后面注册的同路径路由处理。
  @Get('next-route')
  skipCurrentRoute(@Next() next: NextFunction): void {
    next('route');
  }

  // 作为前一个 next('route') 的后续匹配路由，发送最终响应。
  @Get('next-route')
  handleNextRoute(): string {
    return 'Handled by the next matching route';
  }

  // 将错误交给 Express 的后续错误处理中间件。
  @Get('next-error')
  forwardError(@Next() next: NextFunction): void {
    next(new Error('routing test error'));
  }
}

@Module({
  controllers: [NextFixtureController],
})
class NextFixtureModule {}

describe('Routing (@Next)', () => {
  // 验证注入的 next 函数可以跳过当前路由并继续匹配。
  it('continues to the next matching route', async () => {
    const app = await NestFactory.create(NextFixtureModule);

    await request(app.getHttpServer()).get('/cats/next-route').expect(200).expect('Handled by the next matching route');
  });

  // 错误应由 Express 错误处理链处理，最终产生 500 响应。
  it('forwards errors to Express error handling', async () => {
    const app = await NestFactory.create(NextFixtureModule);

    await request(app.getHttpServer()).get('/cats/next-error').expect(500);
  });
});
