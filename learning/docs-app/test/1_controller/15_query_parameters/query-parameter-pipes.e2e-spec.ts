import { Controller, Get, Module, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

class ToNumberPipe {
  // 查询字符串由管道显式转成 number。
  transform(value: unknown): number {
    return Number(value);
  }
}

@Controller('query-pipes')
class QueryParameterPipesController {
  @Get('age')
  getAge(@Query('age', { pipes: [ToNumberPipe] }) age: number): { age: number; runtimeType: string } {
    return { age, runtimeType: typeof age };
  }
}

@Module({ controllers: [QueryParameterPipesController] })
class QueryParameterPipesModule {}

describe('Query parameter pipes', () => {
  it('converts a numeric query parameter in the pipe', async () => {
    const app = await NestFactory.create(QueryParameterPipesModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/query-pipes/age?age=2')
      .expect(200)
      .expect({ age: 2, runtimeType: 'number' });
  });
});
