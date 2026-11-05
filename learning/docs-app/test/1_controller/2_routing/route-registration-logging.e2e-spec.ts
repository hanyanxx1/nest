import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from '../../../@nest/common/index.js';
import { vi } from 'vitest';

@Controller('cats')
class RouteLoggingController {
  @Get('list')
  findAll(): string {
    return 'cats';
  }
}

@Module({ controllers: [RouteLoggingController] })
class RouteLoggingModule {}

describe('Route registration logs', () => {
  it('logs the method and path when a route is registered', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    try {
      const app = await NestFactory.create(RouteLoggingModule);
      await app.init();

      // 路由日志应包含注册路径与 HTTP 方法。
      expect(log).toHaveBeenCalledWith('Mapped {/cats/list, GET} route');
    } finally {
      log.mockRestore();
    }
  });
});
