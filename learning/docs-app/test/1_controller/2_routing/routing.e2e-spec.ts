import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller(['cats', 'felines'])
class RoutingFixtureController {
  // 用两个控制器前缀和两个方法路径，观察 Nest 是否注册它们的笛卡尔组合。
  @Get(['list', 'all'])
  findAll(): { matched: boolean } {
    return { matched: true };
  }

  // 返回普通对象，测试框架是否将其序列化为 JSON 响应。
  @Get('object')
  findObject(): { name: string } {
    return { name: 'Mimi' };
  }

  // 返回数组，测试框架是否将整个数组序列化为 JSON 响应。
  @Get('array')
  findArray(): { name: string }[] {
    return [{ name: 'Mimi' }, { name: 'Luna' }];
  }
}

@Module({
  controllers: [RoutingFixtureController],
})
class RoutingFixtureModule {}

describe('Routing (path arrays)', () => {
  // 四种路径组合都应命中同一个控制器方法。
  it('registers every controller-prefix and method-path combination', async () => {
    const app = await NestFactory.create(RoutingFixtureModule);
    const server = app.getHttpServer();

    for (const path of ['/cats/list', '/cats/all', '/felines/list', '/felines/all']) {
      await request(server).get(path).expect(200).expect({ matched: true });
    }
  });

  // 标准响应模式会把对象返回值作为 JSON 响应体发送。
  it('serializes an object return value as JSON', async () => {
    const app = await NestFactory.create(RoutingFixtureModule);

    await request(app.getHttpServer()).get('/cats/object').expect(200).expect({ name: 'Mimi' });
  });

  // 标准响应模式会把数组返回值作为 JSON 响应体发送。
  it('serializes an array return value as JSON', async () => {
    const app = await NestFactory.create(RoutingFixtureModule);

    await request(app.getHttpServer())
      .get('/cats/array')
      .expect(200)
      .expect([{ name: 'Mimi' }, { name: 'Luna' }]);
  });
});
