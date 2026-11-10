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
  // 保存写入的数据，供后续请求读取。
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

describe('Services', () => {
  it('stores a cat through the service and returns it on a later request', async () => {
    const app = await NestFactory.create(CatsModule);
    await app.init();

    const server = app.getHttpServer();
    const cat: Cat = { name: 'Milo', age: 3, breed: 'Maine Coon' };

    // 先通过 POST 写入，再通过 GET 检查服务是否保存了数据。
    await request(server).post('/cats').send(cat).expect(201);
    await request(server).get('/cats').expect(200).expect([cat]);
  });
});
