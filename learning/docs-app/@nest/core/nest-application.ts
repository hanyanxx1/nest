// 使用 Express 的应用类型描述底层 HTTP 服务，但核心应用只依赖它的 listen 能力。
import type { Server } from 'node:http';
import type { Application, RequestHandler } from 'express';
import { Logger } from '../common/index.js';

export class NestApplication {
  private initialized = false;
  private readonly logger = new Logger(NestApplication.name);
  private server?: Server;

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

      // 记录监听错误，同时把原错误继续交给调用方。
      server.once('error', (error) => {
        this.logger.error(error.toString());
        reject(error);
      });

      this.server = server;
    });
  }

  // 关闭 listen() 启动的服务；没有启动过时直接返回。
  close(): Promise<void> {
    const server = this.server;
    if (!server) {
      return Promise.resolve();
    }

    this.server = undefined;
    return new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  // 与官方一致：use() 把中间件交给底层 HTTP 服务注册。
  use(...handlers: RequestHandler[]): this {
    this.httpServer.use(...handlers);
    return this;
  }

  // 只初始化一次：路由注册成功后输出就绪日志。
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.registerRoutes();
    this.initialized = true;
    this.logger.log('Nest application successfully started');
  }
}
