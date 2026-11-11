import { Body, Controller, Module, Post, RawBody } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('raw-body')
class RawBodyFixtureController {
  // 同时注入解析后的对象和原始 Buffer，对比两者的差别。
  @Post()
  create(
    @Body() body: { name: string },
    @RawBody() rawBody: Buffer | undefined,
  ): { name: string; raw: string | undefined } {
    return { name: body.name, raw: rawBody?.toString() };
  }
}

@Module({
  controllers: [RawBodyFixtureController],
})
class RawBodyFixtureModule {}

describe('Request data (@RawBody)', () => {
  // 开启 rawBody 后，@RawBody() 应拿到未经 JSON 解析的原始字节；空格等格式原样保留。
  it('injects the unparsed request body when rawBody is enabled', async () => {
    const app = await NestFactory.create(RawBodyFixtureModule, { rawBody: true });
    await app.init();

    await request(app.getHttpServer())
      .post('/raw-body')
      .set('Content-Type', 'application/json')
      .send('{ "name": "Milo" }')
      .expect(201)
      .expect({ name: 'Milo', raw: '{ "name": "Milo" }' });
  });
});
