import { Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 标准方式：直接返回对象或字符串。
   * Nest 会自动：
   * 1. 设置 HTTP 状态码（GET/PUT/DELETE 默认 200，POST 默认 201）
   * 2. 序列化返回值为 JSON
   * 3. 设置 Content-Type: application/json
   *
   * 调用：GET /cats
   * 响应：200 + [{ name: 'Mimi' }]
   */
  @Get('cats')
  getCats(): { name: string }[] {
    return [{ name: 'Mimi' }];
  }

  /**
   * 标准方式示例 2：返回字符串。
   * Nest 会自动设置 Content-Type: text/plain，响应 200 + "Hello from Nest"
   *
   * 调用：GET /cats/message
   * 响应：200 + "Hello from Nest"
   */
  @Get('cats/message')
  getCatsMessage(): string {
    return 'Hello from Nest';
  }

  /**
   * 库特定方式（Library-specific）：使用 @Res() 装饰器注入 Express Response 对象。
   *
   * 方式特点：
   * - 方法接收 Express Response 对象作为参数
   * - 开发者完全控制响应：设置状态码、响应头、响应体
   * - 方法返回 void/undefined，因为响应已由方法内部发送
   * - 无需 Nest 自动序列化和处理状态码
   *
   * 调用：GET /cats/native
   * 响应：200 + "Sent by Express response"（纯文本）
   *
   * 这个方式适用于：
   * 1. 需要细粒度控制响应（设置特殊响应头、流式响应等）
   * 2. 返回非 JSON 的内容（二进制、流、文件等）
   */
  @Get('cats/native')
  getCatsWithNativeResponse(@Res() response: Response): void {
    response.status(200).send('Sent by Express response');
  }

  /**
   * 库特定方式示例 2：使用 passthrough: true。
   *
   * 方式特点：
   * - @Res({ passthrough: true }) 让 Nest 同时处理两件事：
   *   1. 注入 Express Response 对象（用于设置状态码等）
   *   2. 处理方法的返回值（用于序列化和发送）
   * - 方法可以设置部分响应信息（如状态码），再返回数据
   * - Nest 会用返回数据做响应体，但尊重已设置的状态码
   *
   * 调用：GET /cats/passthrough
   * 执行：
   *   1. response.status(202) 设置状态码为 202
   *   2. 方法返回 [{ name: 'Mimi' }]
   *   3. Nest 用 202 + 序列化的数组作为最终响应
   * 响应：202 + [{ name: 'Mimi' }]
   *
   * 这个方式适用于：
   * 1. 需要设置自定义状态码或响应头
   * 2. 但返回体仍由 Nest 序列化（标准 JSON 格式）
   */
  @Get('cats/passthrough')
  getCatsWithPassthrough(
    @Res({ passthrough: true }) response: Response,
  ): { name: string }[] {
    response.status(202);
    return [{ name: 'Mimi' }];
  }

  @Post('cats')
  @HttpCode(202)
  createCat(): { name: string } {
    return { name: 'Mimi' };
  }
}
