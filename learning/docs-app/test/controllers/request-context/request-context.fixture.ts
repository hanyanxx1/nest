import { Controller, Get, Headers, Module } from '@nestjs/common';

@Controller()
class RequestContextFixtureController {
  @Get('context/headers')
  getTraceId(@Headers('x-trace-id') traceId: string | string[] | undefined): {
    traceId: string | string[] | undefined;
  } {
    return { traceId };
  }

  @Get('context/all-headers')
  getAllHeaders(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): { traceId: string | string[] | undefined } {
    return { traceId: headers['x-trace-id'] };
  }
}

@Module({
  controllers: [RequestContextFixtureController],
})
export class RequestContextFixtureModule {}
