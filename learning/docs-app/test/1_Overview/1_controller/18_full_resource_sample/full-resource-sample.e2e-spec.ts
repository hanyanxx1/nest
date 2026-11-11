import { Body, Controller, Module, Param, Put } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Controller('cats')
class FullResourceSampleController {
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateCatDto: { name: string; age: number },
  ): { id: string; updateCatDto: { name: string; age: number } } {
    return { id, updateCatDto };
  }
}

@Module({ controllers: [FullResourceSampleController] })
class FullResourceSampleModule {}

describe('Full resource sample', () => {
  it('injects the route parameter and request body into their update arguments', async () => {
    const app = await NestFactory.create(FullResourceSampleModule);
    await app.init();

    await request(app.getHttpServer())
      .put('/cats/42')
      .send({ name: 'Milo', age: 3 })
      .expect(200)
      .expect({
        id: '42',
        updateCatDto: { name: 'Milo', age: 3 },
      });
  });
});
