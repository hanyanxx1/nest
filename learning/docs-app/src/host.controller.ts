import { Controller, Get, HostParam } from '@nestjs/common';

@Controller({ host: ':account.example.com' })
export class HostController {
  @Get('context/host-param')
  getHostParam(@HostParam('account') account: string): { account: string } {
    return { account };
  }
}
