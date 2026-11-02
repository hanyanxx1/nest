import { Controller, Get, Headers, HostParam, Ip, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

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
class RequestContextFixtureModule {}

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
class HostRoutingFixtureModule {}

describe('Request context (@Headers)', () => {
  // 按名称提取单个请求头。
  it('injects a request header by key', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);
    await app.init();

    await request(app.getHttpServer()).get('/context/headers').set('x-trace-id', 'trace-123').expect(200).expect({
      traceId: 'trace-123',
    });
  });

  // 不传名称时，@Headers() 注入完整请求头对象。
  it('injects all request headers when @Headers has no key', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);
    await app.init();

    await request(app.getHttpServer()).get('/context/all-headers').set('x-trace-id', 'trace-123').expect(200).expect({
      traceId: 'trace-123',
    });
  });

  // @Ip() 注入底层请求对象识别出的客户端 IP。
  it('injects the client IP address', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/context/ip')
      .expect(200)
      .expect((response) => {
        expect(response.body.ip).toEqual(expect.any(String));
        expect(response.body.ip.length).toBeGreaterThan(0);
      });
  });
});

describe('Request context (host routing prerequisite)', () => {
  // Host 路由除了 URL 路径外，还必须匹配请求的 Host 头。
  it('matches a route by host', async () => {
    const app = await NestFactory.create(HostRoutingFixtureModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/context/host-route')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ matched: true });

    await request(app.getHttpServer()).get('/context/host-route').set('host', 'other.example.net').expect(404);
  });
});

describe('Request context (@HostParam)', () => {
  // 从匹配的 Host 名称中提取动态部分 account。
  it('injects a host parameter by key', async () => {
    const app = await NestFactory.create(HostRoutingFixtureModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/context/host-param')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ account: 'tenant' });
  });

  // 不指定参数名时，@HostParam() 注入全部 Host 动态参数。
  it('injects all host parameters when @HostParam has no key', async () => {
    const app = await NestFactory.create(HostRoutingFixtureModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/context/all-host-params')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ hosts: { account: 'tenant' } });
  });
});
