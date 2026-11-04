import { Body, Controller, Module, Post, StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

// 异步 schema：用转换结果确认管道等待了校验 Promise。
const asyncBodySchema = {
  '~standard': {
    version: 1,
    vendor: 'learning',
    async validate(value: unknown) {
      if (typeof value !== 'object' || value === null || !('name' in value) || typeof value.name !== 'string') {
        return { issues: [{ message: 'name must be a string' }] };
      }

      return { value: { name: value.name.toUpperCase() } };
    },
  },
};

// schema 校验成功后把 name 转成大写，用响应确认转换结果传到了控制器。
const bodySchema = {
  '~standard': {
    version: 1,
    vendor: 'learning',
    validate(value: unknown) {
      if (typeof value !== 'object' || value === null || !('name' in value) || typeof value.name !== 'string') {
        return { issues: [{ message: 'name must be a string' }] };
      }

      return { value: { name: value.name.toUpperCase() } };
    },
  },
};

@Controller('schema-validation')
class SchemaValidationController {
  // 把 schema 和 StandardSchemaValidationPipe 都附加到 body 参数上。
  @Post()
  create(
    @Body({ schema: bodySchema, pipes: [StandardSchemaValidationPipe] })
    body: {
      name: string;
    },
  ): { name: string } {
    return body;
  }

  // 这个路由使用异步 schema，验证转换后的值仍传到控制器。
  @Post('async')
  createAsync(
    @Body({ schema: asyncBodySchema, pipes: [StandardSchemaValidationPipe] })
    body: {
      name: string;
    },
  ): { name: string } {
    return body;
  }
}

@Module({ controllers: [SchemaValidationController] })
class SchemaValidationModule {}

describe('Request data (Standard Schema validation)', () => {
  // 请求中的 name 应由 schema 转成大写，再交给控制器并返回。
  it('passes the value returned by the schema to the handler', async () => {
    const app = await NestFactory.create(SchemaValidationModule);
    await app.init();

    await request(app.getHttpServer())
      .post('/schema-validation')
      .send({ name: 'Milo' })
      .expect(201)
      .expect({ name: 'MILO' });
  });

  // schema 返回 issues 时，请求应被拒绝，并以 400 响应。
  it('returns 400 when schema validation fails', async () => {
    const app = await NestFactory.create(SchemaValidationModule);
    await app.init();

    await request(app.getHttpServer()).post('/schema-validation').send({ name: 123 }).expect(400);
  });

  it('awaits asynchronous schema validation and passes its result to the handler', async () => {
    const app = await NestFactory.create(SchemaValidationModule);
    await app.init();

    await request(app.getHttpServer())
      .post('/schema-validation/async')
      .send({ name: 'Milo' })
      .expect(201)
      .expect({ name: 'MILO' });
  });
});
