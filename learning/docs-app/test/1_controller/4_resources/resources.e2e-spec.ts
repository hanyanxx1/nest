import { All, Controller, Delete, Get, Head, Module, Options, Patch, Post, Put, QueryMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class CatsController {
  // 与 GET 共用 /cats 路径，通过 HTTP 方法区分处理器。
  @Post()
  create(): string {
    return 'This action adds a new cat';
  }

  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
@Module({ controllers: [CatsController] })
class CatsModule {}

@Controller('cats')
class PutCatsController {
  // 用单独的模块测试尚未支持的 PUT 方法，不影响 GET/POST 用例。
  @Put()
  update(): string {
    return 'This action updates a cat';
  }
}
@Module({ controllers: [PutCatsController] })
class PutCatsModule {}

@Controller('cats')
class DeleteCatsController {
  // 单独测试 DELETE 注册，避免影响其他方法的用例。
  @Delete()
  remove(): string {
    return 'This action removes a cat';
  }
}
@Module({ controllers: [DeleteCatsController] })
class DeleteCatsModule {}

@Controller('cats')
class PatchCatsController {
  // 单独测试 PATCH 注册，不影响现有方法用例。
  @Patch()
  updatePartial(): string {
    return 'This action partially updates a cat';
  }
}
@Module({ controllers: [PatchCatsController] })
class PatchCatsModule {}

@Controller('cats')
class OptionsCatsController {
  // 用单独的模块测试 OPTIONS 方法注册。
  @Options()
  describeOptions(): string {
    return 'This action handles OPTIONS';
  }
}
@Module({ controllers: [OptionsCatsController] })
class OptionsCatsModule {}

let headHandlerCalls = 0;

@Controller('cats')
class HeadCatsController {
  @Head()
  describeHead(): string {
    headHandlerCalls += 1;
    return 'This action handles HEAD';
  }
}

@Module({ controllers: [HeadCatsController] })
class HeadCatsModule {}

@Controller('cats')
class QueryCatsController {
  @QueryMethod()
  describeQuery(): string {
    return 'This action handles QUERY';
  }
}

@Module({ controllers: [QueryCatsController] })
class QueryCatsModule {}

let allHandlerCalls = 0;

@Controller('cats')
class AllCatsController {
  @All()
  handleAll(): string {
    allHandlerCalls += 1;
    return 'This action handles all methods';
  }
}

@Module({ controllers: [AllCatsController] })
class AllCatsModule {}

describe('Resources', () => {
  // 同一路径的 GET 与 POST 应分别命中各自的控制器方法。
  it('routes GET and POST requests to their corresponding handlers', async () => {
    const app = await NestFactory.create(CatsModule);
    await app.init();

    await request(app.getHttpServer()).get('/cats').expect(200).expect('This action returns all cats');

    await request(app.getHttpServer()).post('/cats').expect(201).expect('This action adds a new cat');
  });

  it('routes PUT requests to the matching handler', async () => {
    const app = await NestFactory.create(PutCatsModule);
    await app.init();

    await request(app.getHttpServer()).put('/cats').expect(200).expect('This action updates a cat');
  });

  it('routes DELETE requests to the matching handler', async () => {
    const app = await NestFactory.create(DeleteCatsModule);
    await app.init();

    await request(app.getHttpServer()).delete('/cats').expect(200).expect('This action removes a cat');
  });

  it('routes PATCH requests to the matching handler', async () => {
    const app = await NestFactory.create(PatchCatsModule);
    await app.init();

    await request(app.getHttpServer()).patch('/cats').expect(200).expect('This action partially updates a cat');
  });

  it('routes OPTIONS requests to the matching handler', async () => {
    const app = await NestFactory.create(OptionsCatsModule);
    await app.init();

    await request(app.getHttpServer()).options('/cats').expect(200).expect('This action handles OPTIONS');
  });

  it('routes HEAD requests to the matching handler', async () => {
    headHandlerCalls = 0;
    const app = await NestFactory.create(HeadCatsModule);
    await app.init();

    await request(app.getHttpServer()).head('/cats').expect(200);
    expect(headHandlerCalls).toBe(1);
  });

  it('routes QUERY requests to the matching handler', async () => {
    const app = await NestFactory.create(QueryCatsModule);
    await app.init();

    const server = app.getHttpServer().listen(0);
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      });

      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('无法获取测试服务器的端口');
      }

      const response = await fetch(`http://127.0.0.1:${address.port}/cats`, {
        method: 'QUERY',
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('This action handles QUERY');
    } finally {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }
    }
  });

  it('routes different HTTP methods to the @All handler', async () => {
    allHandlerCalls = 0;
    const app = await NestFactory.create(AllCatsModule);
    await app.init();

    const httpServer = app.getHttpServer();

    await request(httpServer).get('/cats').expect(200).expect('This action handles all methods');
    await request(httpServer).post('/cats').expect(200).expect('This action handles all methods');
    await request(httpServer).delete('/cats').expect(200).expect('This action handles all methods');

    expect(allHandlerCalls).toBe(3);
  });
});
