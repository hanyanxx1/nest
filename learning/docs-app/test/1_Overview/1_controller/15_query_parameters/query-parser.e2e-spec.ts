import { Controller, Get, Module, Query } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('query-parser')
class QueryParserController {
  // 返回整个 query，观察 Express parser 生成的数据结构。
  @Get('complex')
  getComplex(@Query() query: unknown): unknown {
    return query;
  }
}

@Module({ controllers: [QueryParserController] })
class QueryParserModule {}

describe('Query parser', () => {
  it('configures the Express extended parser through the Nest application', async () => {
    const app = await NestFactory.create(QueryParserModule);

    // 用 NestApplication 公共入口配置 parser，并检查 app.set() 可继续链式调用。
    await app.set('query parser', 'extended').init();

    await request(app.getHttpServer())
      .get('/query-parser/complex?filter[where][name]=John&filter[where][age]=30&item[]=1&item[]=2')
      .expect(200)
      .expect({
        filter: { where: { name: 'John', age: '30' } },
        item: ['1', '2'],
      });
  });
});
