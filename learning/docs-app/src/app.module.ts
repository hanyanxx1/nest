import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HostController } from './host.controller.js';

@Module({
  imports: [],
  controllers: [AppController, HostController],
  providers: [AppService],
})
export class AppModule {}
