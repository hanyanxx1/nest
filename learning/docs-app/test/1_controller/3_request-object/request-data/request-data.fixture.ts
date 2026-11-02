import { Body, Controller, Get, Module, Param, Post, Query } from '@nestjs/common';

@Controller()
class RequestDataFixtureController {
  // 从动态路由片段中读取名为 id 的单个参数。
  @Get('cats/:id')
  findOne(@Param('id') id: string): { id: string } {
    return { id };
  }

  // 不指定参数名时，将当前路由的全部参数作为对象注入。
  @Get('cats/:id/details')
  findParams(@Param() params: Record<string, string>): Record<string, string> {
    return params;
  }

  // 从查询字符串中读取 name 字段。
  @Get('search-cats')
  search(@Query('name') name: string): { name: string } {
    return { name };
  }

  // 不指定字段名时，将全部查询参数作为对象注入。
  @Get('search-cats/all')
  searchAll(@Query() query: Record<string, string>): Record<string, string> {
    return query;
  }

  // 不指定字段名时，@Body() 注入完整的 JSON 请求体。
  @Post('cats')
  create(@Body() body: { name: string }): { name: string } {
    return body;
  }

  // 指定字段名时，@Body('name') 只注入请求体中的 name。
  @Post('cats/named')
  createNamed(@Body('name') name: string): { name: string } {
    return { name };
  }
}

// 将请求参数测试控制器注册到独立的最小测试模块中。
@Module({
  controllers: [RequestDataFixtureController],
})
export class RequestDataFixtureModule {}
