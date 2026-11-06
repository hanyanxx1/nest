import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from '../../../@nest/common/index.js';
import { vi } from 'vitest';

@Controller('duplicate-default')
class DefaultDuplicateController {
  @Get('same')
  first(): string {
    return 'first';
  }

  @Get('same')
  second(): string {
    return 'second';
  }
}

@Module({ controllers: [DefaultDuplicateController] })
class DefaultDuplicateModule {}

@Controller('reports')
class HostlessReportsController {
  @Get('status')
  getStatus(): string {
    return 'hostless';
  }
}

@Controller({ path: 'reports', host: 'api.example.com' })
class HostSpecificReportsController {
  @Get('status')
  getStatus(): string {
    return 'host-specific';
  }
}

@Module({
  controllers: [HostlessReportsController, HostSpecificReportsController],
})
class HostOverlapModule {}

describe('Default route conflict policy', () => {
  it('keeps duplicate routes silent when no policy is configured', async () => {
    const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    try {
      // 未配置策略时，重复路由应保持默认行为：允许初始化且不告警。
      const app = await NestFactory.create(DefaultDuplicateModule);
      await app.init();

      expect(warning).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });
});

describe('Host route conflict detection', () => {
  it('rejects initialization when a hostless route overlaps a host-specific route', async () => {
    const app = await NestFactory.create(HostOverlapModule, {
      routeConflictPolicy: { shadow: 'error' },
    });

    // 无 host 限制的路由也能匹配 api.example.com，因此与它发生 shadow。
    await expect(app.init()).rejects.toThrow(/GET .*overlaps GET /);
  });
});
