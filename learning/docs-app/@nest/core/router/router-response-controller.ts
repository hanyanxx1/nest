import 'reflect-metadata';
import { PARAM_DECORATORS_METADATA } from '../../common/constants.js';

interface ResponseAdapter {
  reply(response: unknown, body: unknown, statusCode?: number): unknown;
}

export class RouterResponseController {
  constructor(private readonly applicationRef: ResponseAdapter) {}

  /**
   * 处理控制器方法的返回值，生成最终的 HTTP 响应。
   *
   * @param result - 控制器方法的返回值
   * @param response - Express Response 对象
   * @param statusCode - 可选的 HTTP 状态码
   * @param handlerMethod - 可选的方法对象，用于读取参数装饰器元数据
   *
   * 工作原理：
   * 1. 如果方法没有 @Res() 装饰器，result 被当作响应体发送
   * 2. 如果方法有 @Res() 装饰器：
   *    - 若 passthrough: false（默认），result 为 undefined，响应已由方法处理，跳过发送
   *    - 若 passthrough: true，result 有内容，继续序列化并发送
   *
   * 示例：
   *   // 无 @Res() 装饰器，result = 'Hello'
   *   apply('Hello', response) → reply(response, 'Hello', 200)
   *
   *   // @Res() 无 passthrough，result = undefined
   *   apply(undefined, response, 200, handlerMethod) → 检测到是 Res 且无 passthrough → 返回（无操作）
   *
   *   // @Res({ passthrough: true })，result = [...]
   *   apply([...], response, 200, handlerMethod) → 检测到 passthrough → reply(response, [...], 200)
   */
  apply(
    result: unknown,
    response: unknown,
    statusCode?: number,
    handlerMethod?: Function,
  ): unknown {
    // 检查方法是否有 @Res() 装饰器
    const paramDecorators = handlerMethod
      ? Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, handlerMethod) || {}
      : {};

    // 查找是否有 Res 装饰器
    let hasResDecorator = false;
    let hasPassthrough = false;

    for (const paramIndex in paramDecorators) {
      const paramInfo = paramDecorators[paramIndex];
      if (paramInfo.decorator === 'Res') {
        hasResDecorator = true;
        if (paramInfo.options?.passthrough === true) {
          hasPassthrough = true;
        }
        break; // 只需找到第一个 Res 装饰器
      }
    }

    // 如果有 @Res() 但 result 是 undefined，说明方法已自行处理响应，不需继续操作
    if (hasResDecorator && !hasPassthrough && result === undefined) {
      return; // 方法已通过 response.send() 等方式发送了响应
    }

    // 其他情况（无 @Res()、或有 @Res({ passthrough: true })），正常序列化并发送
    return this.applicationRef.reply(response, result, statusCode);
  }
}
