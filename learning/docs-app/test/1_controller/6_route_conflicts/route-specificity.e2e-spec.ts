import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('reports')
class ReportRoutesController {
  // 通配符先声明，静态路由后声明，用于观察 specificity 的注册顺序。
  @Get('*')
  findAny(): string {
    return 'wildcard route';
  }

  @Get('summary')
  findSummary(): string {
    return 'static route';
  }
}

@Module({ controllers: [ReportRoutesController] })
class ReportRoutesModule {}

@Controller('accounts')
class EqualSpecificityController {
  @Get(':id')
  findById(): string {
    return 'first parameter route';
  }

  @Get(':slug')
  findBySlug(): string {
    return 'second parameter route';
  }
}

@Module({ controllers: [EqualSpecificityController] })
class EqualSpecificityModule {}

describe('Route specificity', () => {
  it('registers a literal route before a wildcard and keeps the wildcard fallback', async () => {
    const app = await NestFactory.create(ReportRoutesModule, {
      routeResolutionStrategy: 'specificity',
    });
    await app.init();

    const server = app.getHttpServer();

    // 静态路径应优先命中；其他路径仍由通配符处理。
    await request(server).get('/reports/summary').expect(200).expect('static route');
    await request(server).get('/reports/archive').expect(200).expect('wildcard route');
  });

  it('preserves declaration order for equally specific routes', async () => {
    const app = await NestFactory.create(EqualSpecificityModule, {
      routeResolutionStrategy: 'specificity',
    });
    await app.init();

    // 两条参数路由具体程度相同，先声明的处理器仍应先注册。
    await request(app.getHttpServer()).get('/accounts/42').expect(200).expect('first parameter route');
  });
});
