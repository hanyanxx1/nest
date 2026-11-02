import { Controller, Get, Headers, Ip, Module, HostParam } from '@nestjs/common';

@Controller()
class RequestContextFixtureController {
  // 通过参数名读取请求头中的追踪 ID。
  @Get('context/headers')
  getTraceId(@Headers('x-trace-id') traceId: string | string[] | undefined): {
    traceId: string | string[] | undefined;
  } {
    return { traceId };
  }

  // 从完整请求头对象中选出追踪 ID，供无 key 的 @Headers() 用例验证。
  @Get('context/all-headers')
  getAllHeaders(@Headers() headers: Record<string, string | string[] | undefined>): {
    traceId: string | string[] | undefined;
  } {
    return { traceId: headers['x-trace-id'] };
  }

  // 将框架注入的客户端 IP 返回给测试断言。
  @Get('context/ip')
  getClientIp(@Ip() ip: string): { ip: string } {
    return { ip };
  }
}

// 该模块只注册 Header 和 IP 用例使用的控制器。
@Module({
  controllers: [RequestContextFixtureController],
})
export class RequestContextFixtureModule {}

@Controller({ host: ':account.example.com' })
class HostRoutingFixtureController {
  // 该处理方法只有在请求 Host 符合动态 account 模式时才会匹配。
  @Get('context/host-route')
  getHostRoute(): { matched: boolean } {
    return { matched: true };
  }

  // 从已匹配 Host 中提取 account 参数。
  @Get('context/host-param')
  getHostParam(@HostParam('account') account: string): { account: string } {
    return { account };
  }

  // 不传参数名时返回完整的 Host 动态参数集合。
  @Get('context/all-host-params')
  getAllHostParams(@HostParam() hosts: Record<string, string>): {
    hosts: Record<string, string>;
  } {
    return { hosts };
  }
}

// 将 Host 路由及 Host 参数用例放入独立测试模块。
@Module({
  controllers: [HostRoutingFixtureController],
})
export class HostRoutingFixtureModule {}
