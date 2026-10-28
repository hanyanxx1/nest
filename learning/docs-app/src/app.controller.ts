import { Controller, Get } from '@nestjs/common';
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

  // @Get('cats/native')
  // getCatsWithNativeResponse(@Res() response: Response): void {
  //   response.status(200).send('Sent by Express response');
  // }

  // @Get('cats/passthrough')
  // getCatsWithPassthrough(
  //   @Res({ passthrough: true }) response: Response,
  // ): { name: string }[] {
  //   response.status(202);
  //   return [{ name: 'Mimi' }];
  // }
}
