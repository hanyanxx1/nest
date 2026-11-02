import { Controller, Get, Module, Req, Session } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { Application, NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import session from 'express-session';

@Controller()
class SessionSetupFixtureController {
  // 通过 @Req() 注入当前请求，再读取 middleware 放到 session 上的 userId。
  @Get('session')
  getSessionFromRequest(@Req() request: ExpressRequest): { userId: string | undefined } {
    return { userId: request.session.userId };
  }

  // 验证 @Session() 能从请求对象中注入 middleware 设置的 session。
  @Get('session/decorated')
  getSession(@Session() session: { userId: string }): { userId: string } {
    return session;
  }

  // 每次请求递增 views，用于区分 session 是否通过 cookie 在请求间保持。
  @Get('session/real')
  incrementSessionViews(@Session() session: { views?: number }): { views: number } {
    const views = (session.views ?? 0) + 1;
    session.views = views;
    return { views };
  }
}

@Module({
  controllers: [SessionSetupFixtureController],
})
class SessionSetupFixtureModule {}

describe('Request context (session middleware setup)', () => {
  // middleware 必须先于控制器路由执行，才能为后续 @Session() 用例提供请求数据。
  it('runs custom middleware before controller routes', async () => {
    const app = await NestFactory.create(SessionSetupFixtureModule, (httpServer: Application) => {
      httpServer.use((request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
        Object.assign(request, { session: { userId: 'cat-42' } });
        next();
      });
    });

    await request(app.getHttpServer()).get('/session').expect(200).expect({ userId: 'cat-42' });
  });

  // session 由前置 middleware 设置，再由 @Session() 注入控制器参数。
  it('injects the session through @Session', async () => {
    const app = await NestFactory.create(SessionSetupFixtureModule, (httpServer: Application) => {
      httpServer.use((request: ExpressRequest, _response: ExpressResponse, next: NextFunction) => {
        Object.assign(request, { session: { userId: 'cat-42' } });
        next();
      });
    });

    await request(app.getHttpServer()).get('/session/decorated').expect(200).expect({ userId: 'cat-42' });
  });

  // 用真实 express-session middleware 和同一个客户端验证 session 跨请求保持。
  it('persists session data across requests with express-session', async () => {
    const app = await NestFactory.create(SessionSetupFixtureModule, (httpServer: Application) => {
      httpServer.use(
        session({
          secret: 'test-only-session-secret',
          resave: false,
          saveUninitialized: false,
          cookie: {
            httpOnly: true,
            secure: false,
          },
        }),
      );
    });
    const agent = request.agent(app.getHttpServer());

    await agent.get('/session/real').expect(200).expect({ views: 1 });
    await agent.get('/session/real').expect(200).expect({ views: 2 });
  });
});

// 声明项目自定义的 session 字段，让 express-session 的类型系统识别它。
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
