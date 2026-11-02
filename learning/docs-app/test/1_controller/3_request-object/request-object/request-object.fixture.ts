import { Controller, Get, Module, Req, Request } from '@nestjs/common';
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
export class RequestObjectFixtureModule {}
