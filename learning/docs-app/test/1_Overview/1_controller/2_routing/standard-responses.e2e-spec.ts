import { Controller, Get, HttpCode, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class StandardResponsesFixtureController {
  // 普通对象应由标准响应流程序列化为 JSON。
  @Get('object')
  findObject(): { name: string } {
    return { name: 'Mimi' };
  }

  // 数组应整体由标准响应流程序列化为 JSON。
  @Get('array')
  findArray(): { name: string }[] {
    return [{ name: 'Mimi' }, { name: 'Luna' }];
  }

  // 字符串是基本类型，标准响应流程会直接发送其内容。
  @Get('message')
  findMessage(): string {
    return 'Hello from Nest';
  }

  // 数字是基本类型；测试通过响应文本检查其实际 HTTP 内容。
  @Get('count')
  findCount(): number {
    return 3;
  }

  // 方法级 @HttpCode 应覆盖 POST 默认状态码 201。
  @Post('custom-status')
  @HttpCode(202)
  createWithCustomStatus(): { created: boolean } {
    return { created: true };
  }
}

@Module({
  controllers: [StandardResponsesFixtureController],
})
class StandardResponsesFixtureModule {}

describe('Routing (standard responses)', () => {
  // 返回对象时，框架应发送 JSON 响应体。
  it('serializes an object return value as JSON', async () => {
    const app = await NestFactory.create(StandardResponsesFixtureModule);
    await app.init();

    await request(app.getHttpServer()).get('/cats/object').expect(200).expect({ name: 'Mimi' });
  });

  // 返回数组时，框架应发送 JSON 数组响应体。
  it('serializes an array return value as JSON', async () => {
    const app = await NestFactory.create(StandardResponsesFixtureModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/cats/array')
      .expect(200)
      .expect([{ name: 'Mimi' }, { name: 'Luna' }]);
  });

  // 返回字符串时，框架应直接发送字符串内容。
  it('sends a string return value directly', async () => {
    const app = await NestFactory.create(StandardResponsesFixtureModule);
    await app.init();

    await request(app.getHttpServer()).get('/cats/message').expect(200).expect('Hello from Nest');
  });

  // Supertest 的数字 .expect() 参数会被解释为状态码，因此改查响应文本。
  it('sends a number return value directly', async () => {
    const app = await NestFactory.create(StandardResponsesFixtureModule);
    await app.init();

    await request(app.getHttpServer())
      .get('/cats/count')
      .expect(200)
      .expect((response) => {
        expect(response.text).toBe('3');
      });
  });

  // 自定义状态码生效时，标准流程仍应发送控制器返回的 JSON。
  it('uses the status code specified by @HttpCode', async () => {
    const app = await NestFactory.create(StandardResponsesFixtureModule);
    await app.init();

    await request(app.getHttpServer()).post('/cats/custom-status').expect(202).expect({ created: true });
  });
});
