import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

class CreateCatDto {
  name!: string;
  age!: number;
  breed!: string;
}

class MetatypePipe {
  // 把管道收到的类型名称放进响应，以验证运行时元数据是否传到管道。
  transform(value: unknown, metadata: { metatype?: unknown }): unknown {
    return {
      body: value,
      metatypeName: typeof metadata.metatype === 'function' ? metadata.metatype.name : null,
    };
  }
}

@Controller('request-payloads')
class RequestPayloadsPipeController {
  @Post()
  create(@Body({ pipes: [MetatypePipe] }) body: CreateCatDto): unknown {
    return body;
  }
}

@Module({ controllers: [RequestPayloadsPipeController] })
class RequestPayloadsPipeModule {}

describe('Request payload DTO metatype', () => {
  it('passes the DTO class to a pipe for a body parameter', async () => {
    const app = await NestFactory.create(RequestPayloadsPipeModule);
    await app.init();

    await request(app.getHttpServer())
      .post('/request-payloads')
      .send({ name: 'Milo', age: 3, breed: 'tabby' })
      .expect(201)
      .expect({
        body: { name: 'Milo', age: 3, breed: 'tabby' },
        metatypeName: 'CreateCatDto',
      });
  });
});
