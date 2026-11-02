import { Controller, Get, Module, Req, Request } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { Request as ExpressRequest } from 'express';

@Controller()
class RequestObjectFixtureController {
  // 将请求方法和 URL 返回给测试，以验证 @Req() 注入的真实请求对象。
  @Get('cats/request-info')
  getRequestInfo(@Req() request: ExpressRequest): {
    method: string;
    url: string;
  } {
    return {
      method: request.method,
      url: request.url,
    };
  }

  // 使用同样的读取逻辑验证 @Request() 与 @Req() 的别名关系。
  @Get('cats/request-alias-info')
  getRequestAliasInfo(@Request() request: ExpressRequest): {
    method: string;
    url: string;
  } {
    return {
      method: request.method,
      url: request.url,
    };
  }
}

// 测试应用只注册当前请求对象用例所需的控制器。
@Module({
  controllers: [RequestObjectFixtureController],
})
class RequestObjectFixtureModule {}

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
