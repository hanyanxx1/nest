import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { RequestDataFixtureModule } from './request-data.fixture.js';

describe('Request data (@Param, @Query, @Body)', () => {
  // 路径中的 :id 应按参数名注入为字符串。
  it('injects a route parameter by key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer()).get('/cats/42').expect(200).expect({
      id: '42',
    });
  });

  // 不传 key 时，@Param() 应注入完整的路由参数对象。
  it('injects all route parameters when @Param has no key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer()).get('/cats/42/details').expect(200).expect({
      id: '42',
    });
  });

  // @Query('name') 只提取查询字符串中指定的字段。
  it('injects a query parameter by key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer()).get('/search-cats?name=Milo').expect(200).expect({
      name: 'Milo',
    });
  });

  // 不传 key 时，@Query() 应注入全部查询参数。
  it('injects all query parameters when @Query has no key', async () => {
    const app = await NestFactory.create(RequestDataFixtureModule);

    await request(app.getHttpServer()).get('/search-cats/all?name=Milo&age=3').expect(200).expect({
      name: 'Milo',
      age: '3',
    });
  });

  // @Body() 不传 key 时，应注入解析后的完整 JSON 请求体；POST 默认状态码为 201。
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

  // @Body('name') 只提取请求体中指定的属性。
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
