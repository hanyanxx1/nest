import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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

  it('rejects initialization when duplicate conflicts use the error policy', async () => {
    const app = await NestFactory.create(DuplicateModule, {
      routeConflictPolicy: { duplicate: 'error' },
    });

    await expect(app.init()).rejects.toThrow('Conflicting HTTP routes detected');
  });
});
