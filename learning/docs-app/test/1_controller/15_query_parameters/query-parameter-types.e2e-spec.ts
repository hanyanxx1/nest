import { Controller, Get, Module, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('query-types')
class QueryParameterTypesController {
  // number 只是 TypeScript 类型声明；返回运行时类型以观察是否发生了转换。
  @Get('age')
  getAge(@Query('age') age: number): { age: number; runtimeType: string } {
    return { age, runtimeType: typeof age };
  }
}

@Module({ controllers: [QueryParameterTypesController] })
class QueryParameterTypesModule {}

describe('Query parameter runtime types', () => {
  it('keeps a numeric query parameter as a string without a pipe', async () => {
    const app = await NestFactory.create(QueryParameterTypesModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/query-types/age?age=2')
      .expect(200)
      .expect({ age: '2', runtimeType: 'string' });
  });
});
