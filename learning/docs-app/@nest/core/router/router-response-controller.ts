import 'reflect-metadata';
import { isObservable, lastValueFrom } from 'rxjs';

interface ResponseAdapter {
  reply(response: unknown, body: unknown, statusCode?: number): unknown;
  setStatus(response: unknown, statusCode: number): unknown;
  setHeader(response: unknown, name: string, value: string): unknown;
  redirect(response: unknown, statusCode: number, url: string): unknown;
}
interface ParamDecoratorMetadata {
  decorator: string;
  options?: { passthrough?: boolean };
}

export class RouterResponseController {
  constructor(private readonly applicationRef: ResponseAdapter) {}

  // 将 Observable 转换为完成时最后发出的值；普通结果保持原样。
  async transformToResult(resultOrDeferred: unknown): Promise<unknown> {
    if (isObservable(resultOrDeferred)) {
      return lastValueFrom(resultOrDeferred);
    }

    return resultOrDeferred;
  }

  redirect(result: unknown, response: unknown, redirectMetadata: { url: string; statusCode?: number }): unknown {
    const dynamicRedirect =
      result !== null && typeof result === 'object' ? (result as Record<string, unknown>) : undefined;

    const returnedUrl = dynamicRedirect?.url;
    const returnedStatusCode = dynamicRedirect?.statusCode;

    // 返回对象只覆盖它提供的有效字段，其余字段沿用装饰器配置。
    const url = typeof returnedUrl === 'string' && returnedUrl ? returnedUrl : redirectMetadata.url;
    const statusCode =
      typeof returnedStatusCode === 'number' && returnedStatusCode
        ? returnedStatusCode
        : (redirectMetadata.statusCode ?? 302);

    return this.applicationRef.redirect(response, statusCode, url);
  }

  setStatus(response: unknown, statusCode: number): void {
    this.applicationRef.setStatus(response, statusCode);
  }

  setHeaders(response: unknown, headers: Array<{ name: string; value: string }>): void {
    for (const { name, value } of headers) {
      this.applicationRef.setHeader(response, name, value);
    }
  }

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
