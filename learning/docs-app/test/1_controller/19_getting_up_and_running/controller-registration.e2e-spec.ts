import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestApplication } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class UnregisteredCatsController {
  @Get()
  findAll(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({
  controllers: [],
})
class EmptyModule {}

describe('Controller registration', () => {
  let app: NestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('does not mount routes of controllers not registered in the module', async () => {
    app = await NestFactory.create(EmptyModule);
    await app.listen(0);

    await request(app.getHttpServer()).get('/cats').expect(404);
  });
});
