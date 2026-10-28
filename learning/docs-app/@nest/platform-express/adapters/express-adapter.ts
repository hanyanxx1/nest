// 使用 Express 的应用类型描述真实 HTTP 服务；RequestHandler 表示 Express 路由处理函数。
import type { Application, RequestHandler } from 'express';

interface ExpressResponseLike {
  status(statusCode: number): this;
  json(body: unknown): this;
  send(body?: string): this;
}

export class ExpressAdapter {
  // 适配器持有真实的 Express 应用；例如 app.get('/cats', handler) 会注册一个 GET 路由。
  constructor(private readonly httpServer: Pick<Application, 'get'>) {}

  // 把框架发现的路径和处理函数注册为 Express GET 路由。
  // 例如 path 为 '/cats'，handler 就会在 GET /cats 请求到达时执行。
  registerGet(path: string, handler: Function): unknown {
    // Nest 核心层不依赖 Express 的 Request/Response 类型；
    // 在平台适配器边界把通用处理函数交给 Express。
    return this.httpServer.get(path, handler as RequestHandler);
  }

  reply(
    response: ExpressResponseLike,
    body: unknown,
    statusCode?: number,
  ): unknown {
    if (statusCode !== undefined) {
      response.status(statusCode);
    }

    if (body === null || body === undefined) {
      return response.send();
    }

    if (typeof body === 'object') {
      return response.json(body);
    }

    return response.send(String(body));
  }
}
