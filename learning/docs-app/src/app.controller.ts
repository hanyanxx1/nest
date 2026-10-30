import { Controller, Get, HttpCode, Next, Post, Res } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('cats')
  getCats(): { name: string }[] {
    return [{ name: 'Mimi' }];
  }

  @Get('cats/message')
  getCatsMessage(): string {
    return 'Hello from Nest';
  }

  @Get('cats/native')
  getCatsWithNativeResponse(@Res() response: Response): string {
    response.status(200).send('Sent by Express response');
    return 'This return value should be ignored';
  }

  @Get('cats/passthrough')
  getCatsWithPassthrough(
    @Res({ passthrough: true }) response: Response,
  ): { name: string }[] {
    response.status(202);
    response.setHeader('X-Cats-Mode', 'passthrough');
    response.cookie('cats-mode', 'passthrough');
    return [{ name: 'Mimi' }];
  }

  @Get('cats/count')
  getCatsCount(): number {
    return 3;
  }

  @Post('cats')
  @HttpCode(202)
  createCat(): { name: string } {
    return { name: 'Mimi' };
  }

  @Get('cats/next')
  continueToNextHandler(@Next() next: NextFunction): void {
    next();
  }

  @Get('cats/next-error')
  forwardErrorToExpress(@Next() next: NextFunction): void {
    console.log('cats/next-error reached');
    next(new Error('cats/next-error test'));
  }

  @Get('cats/next-route')
  skipCurrentRoute(@Next() next: NextFunction): void {
    console.log('first route: calling next("route")');
    next('route');
  }

  @Get('cats/next-route')
  handleNextRoute(): string {
    console.log('second route reached');
    return 'Handled by the next matching route';
  }
}
