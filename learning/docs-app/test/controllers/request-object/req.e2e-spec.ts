import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { RequestObjectFixtureModule } from './request-object.fixture.js';

describe('Request object (@Req, @Request)', () => {
  it('injects the HTTP method and URL through @Req', async () => {
    const app = await NestFactory.create(RequestObjectFixtureModule);

    await request(app.getHttpServer())
      .get('/cats/request-info')
      .expect(200)
      .expect({
        method: 'GET',
        url: '/cats/request-info',
      });
  });

  it('injects the HTTP method and URL through the @Request alias', async () => {
    const app = await NestFactory.create(RequestObjectFixtureModule);

    await request(app.getHttpServer())
      .get('/cats/request-alias-info')
      .expect(200)
      .expect({
        method: 'GET',
        url: '/cats/request-alias-info',
      });
  });
});
