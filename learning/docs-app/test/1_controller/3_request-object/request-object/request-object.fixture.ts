import { Controller, Get, Module, Req, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';

@Controller()
class RequestObjectFixtureController {
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

@Module({
  controllers: [RequestObjectFixtureController],
})
export class RequestObjectFixtureModule {}
