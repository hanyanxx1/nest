import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Injectable()
class CatsService {
  findAll(): string[] {
    return ['Milo'];
  }
}

@Controller('cats')
class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Get()
  findAll(): string[] {
    return this.catsService.findAll();
  }
}

// 最深层模块：保留原有的 Cats Controller 和 Provider。
@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
class CatsModule {}

//---------------------------CatsLayer1Module--------------------

@Injectable()
class CatsLayer1Service {
  findAll(): string[] {
    return ['Layer 1'];
  }
}

@Controller('layer-one')
class CatsLayer1Controller {
  constructor(private readonly catsLayer1Service: CatsLayer1Service) {}

  @Get()
  findAll(): string[] {
    return this.catsLayer1Service.findAll();
  }
}

// 每个中间模块登记自己的 Controller 和 Provider，再导入下一层。
@Module({
  imports: [CatsModule],
  controllers: [CatsLayer1Controller],
  providers: [CatsLayer1Service],
})
class CatsLayer1Module {}

//---------------------------CatsLayer2Module--------------------

@Injectable()
class CatsLayer2Service {
  findAll(): string[] {
    return ['Layer 2'];
  }
}

@Controller('layer-two')
class CatsLayer2Controller {
  constructor(private readonly catsLayer2Service: CatsLayer2Service) {}

  @Get()
  findAll(): string[] {
    return this.catsLayer2Service.findAll();
  }
}

@Module({
  imports: [CatsLayer1Module],
  controllers: [CatsLayer2Controller],
  providers: [CatsLayer2Service],
})
class CatsLayer2Module {}

//---------------------------DeepAppModule--------------------

@Injectable()
class DeepAppService {
  findAll(): string[] {
    return ['Root'];
  }
}

@Controller('deep-root')
class DeepAppController {
  constructor(private readonly deepAppService: DeepAppService) {}

  @Get()
  findAll(): string[] {
    return this.deepAppService.findAll();
  }
}

@Module({
  imports: [CatsLayer2Module],
  controllers: [DeepAppController],
  providers: [DeepAppService, CatsLayer2Service],
})
class DeepAppModule {}

@Module({
  imports: [CatsModule],
})
class AppModule {}

describe('Feature modules', () => {
  it('registers controllers and providers from an imported module', async () => {
    const app = await NestFactory.create(AppModule);
    await app.init();

    await request(app.getHttpServer()).get('/cats').expect(200).expect(['Milo']);
  });

  it('discovers a controller through three nested imports', async () => {
    const app = await NestFactory.create(DeepAppModule);
    await app.init();

    // 最深层 Controller 能响应，说明模块扫描穿过了所有 imports。
    await request(app.getHttpServer()).get('/cats').expect(200).expect(['Milo']);
  });

  it('registers controllers and providers at every nested module level', async () => {
    const app = await NestFactory.create(DeepAppModule);
    await app.init();

    // 四个不同的响应值分别确认根模块、中间模块和最深层模块都生效。
    await request(app.getHttpServer()).get('/deep-root').expect(200).expect(['Root']);
    await request(app.getHttpServer()).get('/layer-two').expect(200).expect(['Layer 2']);
    await request(app.getHttpServer()).get('/layer-one').expect(200).expect(['Layer 1']);
    await request(app.getHttpServer()).get('/cats').expect(200).expect(['Milo']);
  });
});
