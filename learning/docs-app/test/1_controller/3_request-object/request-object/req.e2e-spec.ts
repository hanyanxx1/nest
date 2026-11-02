import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { RequestObjectFixtureModule } from './request-object.fixture.js';

describe('Request object (@Req, @Request)', () => {
  // 验证 @Req() 将底层 Express Request 注入参数，供处理方法读取请求信息。
  it('injects the HTTP method and URL through @Req', async () => {
    const app = await NestFactory.create(RequestObjectFixtureModule);

    await request(app.getHttpServer()).get('/cats/request-info').expect(200).expect({
      method: 'GET',
      url: '/cats/request-info',
    });
  });

  // @Request() 是 @Req() 的别名，应注入同一个类型的请求对象。
  it('injects the HTTP method and URL through the @Request alias', async () => {
    const app = await NestFactory.create(RequestObjectFixtureModule);

    await request(app.getHttpServer()).get('/cats/request-alias-info').expect(200).expect({
      method: 'GET',
      url: '/cats/request-alias-info',
    });
  });
});
