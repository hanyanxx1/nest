import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller(['cats', 'felines'])
class RoutingFixtureController {
  @Get(['list', 'all'])
  findAll(): { matched: boolean } {
    return { matched: true };
  }

  @Get('object')
  findObject(): { name: string } {
    return { name: 'Mimi' };
  }

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
  it('registers every controller-prefix and method-path combination', async () => {
    const app = await NestFactory.create(RoutingFixtureModule);
    const server = app.getHttpServer();

    for (const path of ['/cats/list', '/cats/all', '/felines/list', '/felines/all']) {
      await request(server).get(path).expect(200).expect({ matched: true });
    }
  });

  it('serializes an object return value as JSON', async () => {
    const app = await NestFactory.create(RoutingFixtureModule);

    await request(app.getHttpServer()).get('/cats/object').expect(200).expect({ name: 'Mimi' });
  });

  it('serializes an array return value as JSON', async () => {
    const app = await NestFactory.create(RoutingFixtureModule);

    await request(app.getHttpServer())
      .get('/cats/array')
      .expect(200)
      .expect([{ name: 'Mimi' }, { name: 'Luna' }]);
  });
});
