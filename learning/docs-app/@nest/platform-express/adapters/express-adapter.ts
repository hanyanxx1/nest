// 使用 Express 的应用类型描述真实 HTTP 服务；RequestHandler 表示 Express 路由处理函数。
import type { Application, RequestHandler } from 'express';

interface ExpressResponseLike {
  status(statusCode: number): this;
  json(body: unknown): this;
  send(body?: string): this;
}

export class ExpressAdapter {
  constructor(private readonly httpServer: Pick<Application, 'get' | 'post'>) {}
  registerGet(path: string, handler: Function): unknown {
    return this.httpServer.get(path, handler as RequestHandler);
  }

  registerPost(path: string, handler: Function): unknown {
    return this.httpServer.post(path, handler as RequestHandler);
  }

  reply(response: ExpressResponseLike, body: unknown, statusCode?: number): unknown {
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
