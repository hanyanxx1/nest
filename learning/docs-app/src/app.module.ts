import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CookieDemoController } from './cookie-demo.controller.js';
import { HostController } from './host.controller.js';

@Module({
  imports: [],
  controllers: [AppController, HostController, CookieDemoController],
  providers: [AppService],
})
export class AppModule {}
