import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';

@Controller()
class RequestDataFixtureController {
  @Get('cats/:id')
  findOne(@Param('id') id: string): { id: string } {
    return { id };
  }

  @Get('cats/:id/details')
  findParams(@Param() params: Record<string, string>): Record<string, string> {
    return params;
  }

  @Get('search-cats')
  search(@Query('name') name: string): { name: string } {
    return { name };
  }

  @Get('search-cats/all')
  searchAll(@Query() query: Record<string, string>): Record<string, string> {
    return query;
  }

  @Post('cats')
  create(@Body() body: { name: string }): { name: string } {
    return body;
  }

  @Post('cats/named')
  createNamed(@Body('name') name: string): { name: string } {
    return { name };
  }
}

@Module({
  controllers: [RequestDataFixtureController],
})
export class RequestDataFixtureModule {}
