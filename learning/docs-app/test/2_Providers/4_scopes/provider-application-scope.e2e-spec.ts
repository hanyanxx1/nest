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

@Controller('cats')
class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  create(@Body() cat: Cat): void {
    this.catsService.create(cat);
  }

  @Get()
  findAll(): Cat[] {
    return this.catsService.findAll();
  }
}

@Module({
  controllers: [CatsController],
  providers: [CatsService],
})
class CatsModule {}

describe('Provider application scope', () => {
  it('creates separate provider instances for separate applications', async () => {
    const firstApp = await NestFactory.create(CatsModule);
    const secondApp = await NestFactory.create(CatsModule);
    await firstApp.init();
    await secondApp.init();

    const cat: Cat = { name: 'Milo', age: 3, breed: 'Maine Coon' };

    // 第一个应用写入后，第二个独立应用不应读到它的数据。
    await request(firstApp.getHttpServer()).post('/cats').send(cat).expect(201);
    await request(secondApp.getHttpServer()).get('/cats').expect(200).expect([]);
  });
});
