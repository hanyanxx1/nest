// 使用 Express 的应用类型描述底层 HTTP 服务，但核心应用只依赖它的 listen 能力。
import type { Application, RequestHandler } from 'express';

export class NestApplication {
  private initialized = false;

  constructor(
    private readonly httpServer: Application,
    private readonly registerRoutes: () => void,
  ) {}

  getHttpServer(): Application {
    return this.httpServer;
  }

  async listen(port: string | number): Promise<void> {
    const numericPort = typeof port === 'number' ? port : Number(port);
    if (!Number.isInteger(numericPort) || numericPort < 0 || numericPort > 65535) {
      throw new RangeError(`无效的 HTTP 端口：${port}`);
    }

    // 启动前先注册路由，保证 app.use() 的中间件排在路由前面。
    await this.init();

    return new Promise((resolve, reject) => {
      const server = this.httpServer.listen(numericPort, () => resolve());
      server.once('error', reject);
    });
  }

  // 与官方一致：use() 把中间件交给底层 HTTP 服务注册。
  use(...handlers: RequestHandler[]): this {
    this.httpServer.use(...handlers);
    return this;
  }

  // 只初始化一次：此时 app.use() 注册的中间件已经在前，路由才挂上去。
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.registerRoutes();
    this.initialized = true;
  }
}
