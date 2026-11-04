// 使用 Express 的应用类型描述真实 HTTP 服务；RequestHandler 表示 Express 路由处理函数。
import type { Application, RequestHandler } from 'express';

interface ExpressResponseLike {
  status(statusCode: number): this;
  json(body: unknown): this;
  send(body?: string): this;
}

export class ExpressAdapter {
  constructor(
    private readonly httpServer: Pick<
      Application,
      'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'query' | 'all'
    >,
  ) {}
  registerGet(path: string, handler: Function): unknown {
    return this.httpServer.get(this.normalizePath(path), handler as RequestHandler);
  }

  registerPost(path: string, handler: Function): unknown {
    return this.httpServer.post(this.normalizePath(path), handler as RequestHandler);
  }

  registerPut(path: string, handler: Function): unknown {
    return this.httpServer.put(this.normalizePath(path), handler as RequestHandler);
  }

  // 使用 Express 的 delete 方法注册 DELETE 路由。
  registerDelete(path: string, handler: Function): unknown {
    return this.httpServer.delete(this.normalizePath(path), handler as RequestHandler);
  }

  // 使用 Express 的 patch 方法注册 PATCH 路由。
  registerPatch(path: string, handler: Function): unknown {
    return this.httpServer.patch(this.normalizePath(path), handler as RequestHandler);
  }

  // 使用 Express 的 options 方法注册 OPTIONS 路由。
  registerOptions(path: string, handler: Function): unknown {
    return this.httpServer.options(this.normalizePath(path), handler as RequestHandler);
  }

  // 使用 Express 的 head 方法注册 HEAD 路由。
  registerHead(path: string, handler: Function): unknown {
    return this.httpServer.head(this.normalizePath(path), handler as RequestHandler);
  }

  // 使用 Express 的 query 方法注册 HTTP QUERY 路由。
  registerQuery(path: string, handler: Function): unknown {
    if (typeof this.httpServer.query !== 'function') {
      throw new Error('当前 Express HTTP 服务不支持 QUERY 路由');
    }

    return this.httpServer.query(this.normalizePath(path), handler as RequestHandler);
  }

  // 使用 Express 的 all 方法，让同一路径接收不同 HTTP 方法。
  registerAll(path: string, handler: Function): unknown {
    return this.httpServer.all(this.normalizePath(path), handler as RequestHandler);
  }

  // Express 5 要求通配符命名；花括号形式也能匹配空后缀。
  private normalizePath(path: string): string {
    return path.endsWith('/*') ? `${path.slice(0, -1)}{*path}` : path;
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
