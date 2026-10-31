import {
  Controller,
  Get,
  Headers,
  Ip,
  Module,
  HostParam,
} from '@nestjs/common';

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

  @Get('context/ip')
  getClientIp(@Ip() ip: string): { ip: string } {
    return { ip };
  }
}

@Module({
  controllers: [RequestContextFixtureController],
})
export class RequestContextFixtureModule {}

@Controller({ host: ':account.example.com' })
class HostRoutingFixtureController {
  @Get('context/host-route')
  getHostRoute(): { matched: boolean } {
    return { matched: true };
  }

  @Get('context/host-param')
  getHostParam(@HostParam('account') account: string): { account: string } {
    return { account };
  }

  @Get('context/all-host-params')
  getAllHostParams(@HostParam() hosts: Record<string, string>): {
    hosts: Record<string, string>;
  } {
    return { hosts };
  }
}

@Module({
  controllers: [HostRoutingFixtureController],
})
export class HostRoutingFixtureModule {}
