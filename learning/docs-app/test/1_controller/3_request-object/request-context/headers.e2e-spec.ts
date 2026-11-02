import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { HostRoutingFixtureModule, RequestContextFixtureModule } from './request-context.fixture.js';

describe('Request context (@Headers)', () => {
  // 按名称提取单个请求头。
  it('injects a request header by key', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);

    await request(app.getHttpServer()).get('/context/headers').set('x-trace-id', 'trace-123').expect(200).expect({
      traceId: 'trace-123',
    });
  });

  // 不传名称时，@Headers() 注入完整请求头对象。
  it('injects all request headers when @Headers has no key', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);

    await request(app.getHttpServer()).get('/context/all-headers').set('x-trace-id', 'trace-123').expect(200).expect({
      traceId: 'trace-123',
    });
  });

  // @Ip() 注入底层请求对象识别出的客户端 IP。
  it('injects the client IP address', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);

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

    await request(app.getHttpServer())
      .get('/context/host-param')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ account: 'tenant' });
  });

  // 不指定参数名时，@HostParam() 注入全部 Host 动态参数。
  it('injects all host parameters when @HostParam has no key', async () => {
    const app = await NestFactory.create(HostRoutingFixtureModule);

    await request(app.getHttpServer())
      .get('/context/all-host-params')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ hosts: { account: 'tenant' } });
  });
});
