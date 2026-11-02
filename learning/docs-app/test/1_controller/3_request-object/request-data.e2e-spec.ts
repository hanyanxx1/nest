import { Body, Controller, Get, Module, Param, Post, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller()
class RequestDataFixtureController {
  // 从动态路由片段中读取名为 id 的单个参数。
  @Get('cats/:id')
  findOne(@Param('id') id: string): { id: string } {
    return { id };
  }

  // 不指定参数名时，将当前路由的全部参数作为对象注入。
  @Get('cats/:id/details')
  findParams(@Param() params: Record<string, string>): Record<string, string> {
    return params;
  }

  // 从查询字符串中读取 name 字段。
  @Get('search-cats')
  search(@Query('name') name: string): { name: string } {
    return { name };
  }

  // 不指定字段名时，将全部查询参数作为对象注入。
  @Get('search-cats/all')
  searchAll(@Query() query: Record<string, string>): Record<string, string> {
    return query;
  }

  // 不指定字段名时，@Body() 注入完整的 JSON 请求体。
  @Post('cats')
  create(@Body() body: { name: string }): { name: string } {
    return body;
  }

  // 指定字段名时，@Body('name') 只注入请求体中的 name。
  @Post('cats/named')
  createNamed(@Body('name') name: string): { name: string } {
    return { name };
  }
}

// 将请求参数测试控制器注册到最小测试模块中。
@Module({
  controllers: [RequestDataFixtureController],
})
class RequestDataFixtureModule {}

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
