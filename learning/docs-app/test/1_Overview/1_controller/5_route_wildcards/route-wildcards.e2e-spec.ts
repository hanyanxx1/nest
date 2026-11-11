import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller()
class RouteWildcardsController {
  @Get('abcd/*')
  findAll(): string {
    return 'This route uses a wildcard';
  }
}

@Module({ controllers: [RouteWildcardsController] })
class RouteWildcardsModule {}

@Controller()
class LiteralCharactersController {
  @Get('abcd-ef')
  findHyphen(): string {
    return 'This route contains a hyphen';
  }

  @Get('abcd.ef')
  findDot(): string {
    return 'This route contains a dot';
  }
}

@Module({ controllers: [LiteralCharactersController] })
class LiteralCharactersModule {}

@Controller()
class MiddleWildcardController {
  @Get('ab{*splat}cd')
  findAll(): string {
    return 'This route uses a named middle wildcard';
  }
}

@Module({ controllers: [MiddleWildcardController] })
class MiddleWildcardModule {}

describe('Route wildcards', () => {
  it('matches a trailing wildcard with zero or more characters', async () => {
    const app = await NestFactory.create(RouteWildcardsModule);
    await app.init();

    for (const path of ['/abcd/', '/abcd/123', '/abcd/abc']) {
      await request(app.getHttpServer()).get(path).expect(200).expect('This route uses a wildcard');
    }
  });

  it('treats hyphens and dots in string paths literally', async () => {
    const app = await NestFactory.create(LiteralCharactersModule);
    await app.init();

    const httpServer = app.getHttpServer();

    await request(httpServer).get('/abcd-ef').expect(200).expect('This route contains a hyphen');
    await request(httpServer).get('/abcd.ef').expect(200).expect('This route contains a dot');
    await request(httpServer).get('/abcd_ef').expect(404);
    await request(httpServer).get('/abcdXef').expect(404);
  });

  it('matches a named wildcard in the middle of a path', async () => {
    const app = await NestFactory.create(MiddleWildcardModule);
    await app.init();

    for (const path of ['/abcd', '/ab123cd', '/ab/foo/cd']) {
      await request(app.getHttpServer()).get(path).expect(200).expect('This route uses a named middle wildcard');
    }
  });
});
