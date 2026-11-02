import { Controller, Get, Module, Res, Response } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { Response as ExpressResponse } from 'express';

@Controller('cats')
class NativeResponsesFixtureController {
  // 控制器使用注入的原生 Express Response 直接发送内容。
  @Get('native')
  sendNativeResponse(@Res() response: ExpressResponse): void {
    response.status(200).send('Sent by native response');
  }

  // 非 passthrough 的 @Res() 会关闭标准响应，因此返回值不会被框架发送。
  @Get('native-return')
  sendNativeResponseAndReturn(@Res() response: ExpressResponse): string {
    response.status(200).send('Sent by native response');
    return 'This return value should be ignored';
  }

  // passthrough 允许修改原生响应，同时保留框架对返回值的处理。
  @Get('passthrough')
  sendWithPassthrough(@Res({ passthrough: true }) response: ExpressResponse): { name: string } {
    response.status(202);
    response.setHeader('X-Cats-Mode', 'passthrough');
    return { name: 'Mimi' };
  }

  // 验证 @Response() 与 @Res() 一样提供原生 Express Response。
  @Get('response-alias')
  sendWithResponseAlias(@Response() response: ExpressResponse): void {
    response.status(200).send('Sent by response alias');
  }
}

@Module({
  controllers: [NativeResponsesFixtureController],
})
class NativeResponsesFixtureModule {}

describe('Routing (native responses)', () => {
  // 验证 @Res() 注入成功，响应由控制器调用原生 send() 发出。
  it('sends a response through the native response object', async () => {
    const app = await NestFactory.create(NativeResponsesFixtureModule);

    await request(app.getHttpServer()).get('/cats/native').expect(200).expect('Sent by native response');
  });

  // 响应体来自原生 send()，而不是控制器返回的字符串。
  it('ignores the return value when using non-passthrough @Res', async () => {
    const app = await NestFactory.create(NativeResponsesFixtureModule);

    await request(app.getHttpServer()).get('/cats/native-return').expect(200).expect('Sent by native response');
  });

  // 状态码和响应头由控制器设置，JSON 响应体仍由框架发送。
  it('keeps standard response handling with passthrough @Res', async () => {
    const app = await NestFactory.create(NativeResponsesFixtureModule);

    await request(app.getHttpServer())
      .get('/cats/passthrough')
      .expect(202)
      .expect('X-Cats-Mode', 'passthrough')
      .expect({ name: 'Mimi' });
  });

  // @Response() 作为别名，应能像 @Res() 一样直接发送响应。
  it('sends a response through the @Response alias', async () => {
    const app = await NestFactory.create(NativeResponsesFixtureModule);

    await request(app.getHttpServer()).get('/cats/response-alias').expect(200).expect('Sent by response alias');
  });
});
