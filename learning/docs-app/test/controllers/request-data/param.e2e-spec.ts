import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { RequestDataFixtureModule } from './request-data.fixture.js';

describe('Request data (@Param, @Query, @Body)', () => {
  it('injects a route parameter by key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer()).get('/cats/42').expect(200).expect({
      id: '42',
    });
  });

  it('injects all route parameters when @Param has no key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer())
      .get('/cats/42/details')
      .expect(200)
      .expect({
        id: '42',
      });
  });

  it('injects a query parameter by key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer())
      .get('/search-cats?name=Milo')
      .expect(200)
      .expect({
        name: 'Milo',
      });
  });

  it('injects all query parameters when @Query has no key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer())
      .get('/search-cats/all?name=Milo&age=3')
      .expect(200)
      .expect({
        name: 'Milo',
        age: '3',
      });
  });

  it('injects the request body when @Body has no key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer())
      .post('/cats')
      .send({
        name: 'Milo',
      })
      .expect(201)
      .expect({
        name: 'Milo',
      });
  });

  it('injects a request body property by key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer())
      .post('/cats/named')
      .send({
        name: 'Milo',
        age: 3,
      })
      .expect(201)
      .expect({
        name: 'Milo',
      });
  });
});
