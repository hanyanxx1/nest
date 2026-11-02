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

  apply(
    result: unknown,
    response: unknown,
    statusCode?: number,
    paramDecorators: Record<number, ParamDecoratorMetadata> = {},
  ): unknown {
    let hasNextDecorator = false;
    let hasNonPassthroughRes = false;

    for (const paramInfo of Object.values(paramDecorators)) {
      if (paramInfo.decorator === 'Next') {
        hasNextDecorator = true;
      } else if (paramInfo.decorator === 'Res' && paramInfo.options?.passthrough !== true) {
        hasNonPassthroughRes = true;
      }
    }

    if (hasNextDecorator || hasNonPassthroughRes) {
      return;
    }

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

    return this.applicationRef.reply(response, result, statusCode);
  }
}
