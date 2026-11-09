import { Controller, Get, Header, HttpCode, Module, Res } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { Response as ExpressResponse } from 'express';

@Controller('native-response-metadata')
class NativeResponseMetadataController {
  @Get()
  @HttpCode(202)
  @Header('X-Cats-Mode', 'native')
  sendWithNativeResponse(@Res() response: ExpressResponse): void {
    response.send('Native response');
  }
}

@Module({ controllers: [NativeResponseMetadataController] })
class NativeResponseMetadataModule {}

describe('Library-specific response metadata', () => {
  it('applies @HttpCode and @Header with non-passthrough @Res', async () => {
    const app = await NestFactory.create(NativeResponseMetadataModule);
    await app.init();

    // 原生响应仍应先采用 @HttpCode 设置的状态码，再由控制器发送内容。
    await request(app.getHttpServer())
      .get('/native-response-metadata')
      .expect(202)
      .expect('X-Cats-Mode', 'native')
      .expect('Native response');
  });
});
