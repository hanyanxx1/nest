import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

@Injectable()
class CommonService {
  getMessage(): { source: string } {
    return { source: 'CommonModule' };
  }
}

// CommonModule 创建并公开 CommonService。
@Module({
  providers: [CommonService],
  exports: [CommonService],
})
class CommonModule {}

// CoreModule 不创建 CommonService，只把导入的 CommonModule 再导出。
@Module({
  imports: [CommonModule],
  exports: [CommonModule],
})
class CoreModule {}

// 根模块只导入 CoreModule；Controller 依赖 CommonService。
@Controller('common')
class AppController {
  constructor(private readonly commonService: CommonService) {}

  @Get()
  getMessage(): { source: string } {
    return this.commonService.getMessage();
  }
}

@Module({
  imports: [CoreModule],
  controllers: [AppController],
})
class AppModule {}

describe('Module re-exporting', () => {
  it('makes a provider available through a re-exported module', async () => {
    const app = await NestFactory.create(AppModule);
    await app.init();

    // 成功得到 CommonModule 的结果，说明依赖沿 CoreModule 的再导出链解析。
    await request(app.getHttpServer()).get('/common').expect(200).expect({ source: 'CommonModule' });
  });
});
