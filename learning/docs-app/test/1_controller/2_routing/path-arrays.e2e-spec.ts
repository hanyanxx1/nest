import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller(['cats', 'felines'])
class PathArraysFixtureController {
  // 用两个控制器前缀和两个方法路径，观察它们是否生成四种组合。
  @Get(['list', 'all'])
  findAll(): { matched: boolean } {
    return { matched: true };
  }
}

@Module({
  controllers: [PathArraysFixtureController],
})
class PathArraysFixtureModule {}

describe('Routing (path arrays)', () => {
  // 四种路径组合都应命中同一个控制器方法。
  it('registers every controller-prefix and method-path combination', async () => {
    const app = await NestFactory.create(PathArraysFixtureModule);
    // 路由在 init() 时才注册，请求前必须先初始化应用。
    await app.init();

    for (const path of ['/cats/list', '/cats/all', '/felines/list', '/felines/all']) {
      await request(app.getHttpServer()).get(path).expect(200).expect({ matched: true });
    }
  });
});
