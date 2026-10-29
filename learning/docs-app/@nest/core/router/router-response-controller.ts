import 'reflect-metadata';

interface ResponseAdapter {
  reply(response: unknown, body: unknown, statusCode?: number): unknown;
}
interface ParamDecoratorMetadata {
  decorator: string;
  options?: { passthrough?: boolean };
}

export class RouterResponseController {
  constructor(private readonly applicationRef: ResponseAdapter) {}

  /**
   * 根据返回值和参数装饰器元数据决定是否委托适配器发送响应。
   *
   * @param result - 控制器方法的返回值
   * @param response - Express Response 对象
   * @param statusCode - 可选的 HTTP 状态码
   * @param paramDecorators - RouterExplorer 读取到的参数装饰器元数据
   *
   * 工作原理：
   * 1. 没有 @Res() 时，将返回值和状态码交给适配器。
   * 2. 有 @Res() 且 passthrough 未启用时，标准响应处理被关闭；方法返回值会被忽略。
   * 3. 有 @Res({ passthrough: true }) 时，仍将返回值和状态码交给适配器。
   */
  apply(
    result: unknown,
    response: unknown,
    statusCode?: number,
    paramDecorators: Record<number, ParamDecoratorMetadata> = {},
  ): unknown {
    // 查找是否有 Res 装饰器
    let hasResDecorator = false;
    let hasPassthrough = false;

    for (const paramInfo of Object.values(paramDecorators)) {
      if (paramInfo.decorator === 'Res') {
        hasResDecorator = true;
        if (paramInfo.options?.passthrough === true) {
          hasPassthrough = true;
        }
        break; // 只需找到第一个 Res 装饰器
      }
    }

    if (hasResDecorator && !hasPassthrough) {
      return;
    }

    // 其他情况（无 @Res()、或有 @Res({ passthrough: true })），正常序列化并发送
    return this.applicationRef.reply(response, result, statusCode);
  }
}
