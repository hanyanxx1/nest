import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import {
  HostRoutingFixtureModule,
  RequestContextFixtureModule,
} from './request-context.fixture.js';

describe('Request context (@Headers)', () => {
  it('injects a request header by key', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);

    await request(app.getHttpServer())
      .get('/context/headers')
      .set('x-trace-id', 'trace-123')
      .expect(200)
      .expect({
        traceId: 'trace-123',
      });
  });

  it('injects all request headers when @Headers has no key', async () => {
    const app = await NestFactory.create(RequestContextFixtureModule);

    await request(app.getHttpServer())
      .get('/context/all-headers')
      .set('x-trace-id', 'trace-123')
      .expect(200)
      .expect({
        traceId: 'trace-123',
      });
  });

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
  it('matches a route by host', async () => {
    const app = await NestFactory.create(HostRoutingFixtureModule);

    await request(app.getHttpServer())
      .get('/context/host-route')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ matched: true });

    await request(app.getHttpServer())
      .get('/context/host-route')
      .set('host', 'other.example.net')
      .expect(404);
  });
});

describe('Request context (@HostParam)', () => {
  it('injects a host parameter by key', async () => {
    const app = await NestFactory.create(HostRoutingFixtureModule);

    await request(app.getHttpServer())
      .get('/context/host-param')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ account: 'tenant' });
  });

  it('injects all host parameters when @HostParam has no key', async () => {
    const app = await NestFactory.create(HostRoutingFixtureModule);

    await request(app.getHttpServer())
      .get('/context/all-host-params')
      .set('host', 'tenant.example.com')
      .expect(200)
      .expect({ hosts: { account: 'tenant' } });
  });
});
