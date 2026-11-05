import { All, Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from '../../../@nest/common/index.js';
import { vi } from 'vitest';
import request from 'supertest';

@Controller('users')
class UsersController {
  // 参数路由先声明，用于观察默认声明顺序对静态路由的影响。
  @Get(':id')
  findOne(): string {
    return 'parameter route';
  }

  @Get('me')
  findMe(): string {
    return 'static route';
  }
}

@Module({ controllers: [UsersController] })
class UsersModule {}

@Controller('accounts')
class OverlappingParameterRoutesController {
  @Get(':id')
  findById(): string {
    return 'id';
  }

  @Get(':slug')
  findBySlug(): string {
    return 'slug';
  }
}

@Module({ controllers: [OverlappingParameterRoutesController] })
class OverlappingParameterRoutesModule {}

// 两个处理器映射到完全相同的 HTTP 方法和路径，用于验证 duplicate 检测。
@Controller('duplicate')
class DuplicateController {
  @Get('same')
  first(): string {
    return 'first';
  }

  @Get('same')
  second(): string {
    return 'second';
  }
}

@Module({ controllers: [DuplicateController] })
class DuplicateModule {}

// 两组不同路径各重复注册一次，用于确认异常消息包含全部冲突。
@Controller('aggregate')
class AggregatedDuplicateController {
  @Get('first')
  firstA(): string {
    return 'first A';
  }

  @Get('first')
  firstB(): string {
    return 'first B';
  }

  @Get('second')
  secondA(): string {
    return 'second A';
  }

  @Get('second')
  secondB(): string {
    return 'second B';
  }
}

@Module({ controllers: [AggregatedDuplicateController] })
class AggregatedDuplicateModule {}

@Controller('health')
class AllAndGetRoutesController {
  @All()
  handleAll(): string {
    return 'all methods';
  }

  @Get()
  handleGet(): string {
    return 'GET';
  }
}

@Module({ controllers: [AllAndGetRoutesController] })
class AllAndGetRoutesModule {}

describe('Route conflicts and resolution order', () => {
  it('uses declaration order by default when a parameter route shadows a static route', async () => {
    const app = await NestFactory.create(UsersModule);
    await app.init();

    await request(app.getHttpServer()).get('/users/me').expect(200).expect('parameter route');
  });

  it('rejects initialization when shadow conflicts use the error policy', async () => {
    const app = await NestFactory.create(UsersModule, {
      routeConflictPolicy: { shadow: 'error' },
    });

    await expect(app.init()).rejects.toThrow('Conflicting HTTP routes detected');
  });

  it('rejects initialization when two parameter routes can match the same request', async () => {
    const app = await NestFactory.create(OverlappingParameterRoutesModule, {
      routeConflictPolicy: { shadow: 'error' },
    });

    // 两种参数名不同，但请求可以同时匹配两条路由，因此应报告 shadow 冲突。
    await expect(app.init()).rejects.toThrow('GET /accounts/:id overlaps GET /accounts/:slug');
  });

  it('rejects initialization when duplicate conflicts use the error policy', async () => {
    const app = await NestFactory.create(DuplicateModule, {
      routeConflictPolicy: { duplicate: 'error' },
    });

    await expect(app.init()).rejects.toThrow('Conflicting HTTP routes detected');
  });

  it('includes all duplicate conflicts in the initialization error', async () => {
    const app = await NestFactory.create(AggregatedDuplicateModule, {
      routeConflictPolicy: { duplicate: 'error' },
    });

    // 同一个异常消息必须同时列出两组不同路径的冲突。
    await expect(app.init()).rejects.toThrow(/GET \/aggregate\/first[\s\S]*GET \/aggregate\/second/);
  });

  it('reports duplicate conflicts through Logger.warn and continues initialization', async () => {
    const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    try {
      const app = await NestFactory.create(DuplicateModule, {
        routeConflictPolicy: { duplicate: 'warn' },
      });

      // warn 策略应调用学习版 Logger，但不阻止初始化。
      await app.init();
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('GET /duplicate/same'));
    } finally {
      warning.mockRestore();
    }
  });

  it('reports shadow conflicts through Logger.warn and continues initialization', async () => {
    const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    try {
      const app = await NestFactory.create(UsersModule, {
        routeConflictPolicy: { shadow: 'warn' },
      });

      // shadow 冲突应通过 Logger 告警，但不阻止初始化。
      await app.init();
      expect(warning).toHaveBeenCalledWith(expect.stringContaining('GET /users/:id overlaps GET /users/me'));
    } finally {
      warning.mockRestore();
    }
  });

  it('does not log duplicate conflicts when the policy is off', async () => {
    const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    try {
      const app = await NestFactory.create(DuplicateModule, {
        routeConflictPolicy: { duplicate: 'off' },
      });

      // off 应静默忽略冲突，同时允许应用初始化。
      await app.init();
      expect(warning).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });

  it('does not log shadow conflicts when the policy is off', async () => {
    const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    try {
      const app = await NestFactory.create(UsersModule, {
        routeConflictPolicy: { shadow: 'off' },
      });

      // shadow:off 应静默忽略参数与静态路由冲突。
      await app.init();
      expect(warning).not.toHaveBeenCalled();
    } finally {
      warning.mockRestore();
    }
  });

  it('prioritizes a static route with the specificity strategy', async () => {
    const app = await NestFactory.create(UsersModule, {
      routeResolutionStrategy: 'specificity',
    });
    await app.init();

    // 静态路由后声明，但 specificity 应让它先匹配。
    await request(app.getHttpServer()).get('/users/me').expect(200).expect('static route');
  });

  it('rejects initialization when All and GET methods overlap on the same path', async () => {
    const app = await NestFactory.create(AllAndGetRoutesModule, {
      routeConflictPolicy: { shadow: 'error' },
    });

    // 同一路径下，ALL 与 GET 的请求方法范围有重叠，应归类为 shadow。
    await expect(app.init()).rejects.toThrow(/ALL .* overlaps GET /);
  });
});
