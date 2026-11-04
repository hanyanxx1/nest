import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

// 把 body.name 转成大写的管道，用来证明管道真的被执行了。
class UpperCasePipe {
  transform(value: { name: string }): { name: string } {
    return { name: value.name.toUpperCase() };
  }
}

// 记录管道收到的 metadata，用来证明 schema 能传到管道里。
let receivedMetadata: { schema?: unknown } | undefined;

class MetadataPipe {
  transform(value: unknown, metadata: { schema?: unknown }): unknown {
    receivedMetadata = metadata;
    return value;
  }
}

const bodySchema = { '~standard': { version: 1, vendor: 'learning', validate: (value: unknown) => ({ value }) } };

@Controller('pipes')
class PipesController {
  // 管道通过 options 附加到 @Body()；控制器拿到的是管道的返回值。
  @Post()
  create(@Body({ pipes: [UpperCasePipe] }) body: { name: string }): { name: string } {
    return body;
  }

  // 同时给出 schema 和管道：管道应能在 metadata 里读到 schema。
  @Post('metadata')
  withMetadata(@Body({ schema: bodySchema, pipes: [MetadataPipe] }) body: unknown): unknown {
    return body;
  }
}

@Module({ controllers: [PipesController] })
class PipesModule {}

describe('Request data (parameter pipes)', () => {
  it('runs the pipes from the options and passes the result to the handler', async () => {
    const app = await NestFactory.create(PipesModule);
    await app.init();

    await request(app.getHttpServer()).post('/pipes').send({ name: 'Milo' }).expect(201).expect({ name: 'MILO' });
  });
  it('passes the parameter schema to the pipe through metadata', async () => {
    const app = await NestFactory.create(PipesModule);
    await app.init();

    await request(app.getHttpServer()).post('/pipes/metadata').send({ name: 'Milo' }).expect(201);

    expect(receivedMetadata?.schema).toBe(bodySchema);
  });
});
