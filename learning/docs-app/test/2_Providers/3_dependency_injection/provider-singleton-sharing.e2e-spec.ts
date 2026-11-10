import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

interface Cat {
  name: string;
  age: number;
  breed: string;
}

@Injectable()
class CatsService {
  private readonly cats: Cat[] = [];

  create(cat: Cat): void {
    this.cats.push(cat);
  }

  findAll(): Cat[] {
    return this.cats;
  }
}

// 两个控制器分别写入和读取，用来观察它们是否共享同一服务实例。
@Controller('cats')
class CatsWriterController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  create(@Body() cat: Cat): void {
    this.catsService.create(cat);
  }
}

@Controller('cats')
class CatsReaderController {
  constructor(private readonly catsService: CatsService) {}

  @Get()
  findAll(): Cat[] {
    return this.catsService.findAll();
  }
}

@Module({
  controllers: [CatsWriterController, CatsReaderController],
  providers: [CatsService],
})
class CatsModule {}

describe('Dependency injection (singleton providers)', () => {
  it('shares one provider instance between dependent controllers', async () => {
    const app = await NestFactory.create(CatsModule);
    await app.init();

    const server = app.getHttpServer();
    const cat: Cat = { name: 'Milo', age: 3, breed: 'Maine Coon' };

    // 写入与读取由不同控制器处理；读到 Milo 表示它们共享服务实例。
    await request(server).post('/cats').send(cat).expect(201);
    await request(server).get('/cats').expect(200).expect([cat]);
  });
});
