// 使用 Express 的应用类型描述底层 HTTP 服务，但核心应用只依赖它的 listen 能力。
import type { Application } from 'express';

export class NestApplication {
  constructor(private readonly httpServer: Application) {}

  getHttpServer(): Application {
    return this.httpServer;
  }

  listen(port: string | number): Promise<void> {
    const numericPort = typeof port === 'number' ? port : Number(port);
    if (!Number.isInteger(numericPort) || numericPort < 0 || numericPort > 65535) {
      throw new RangeError(`无效的 HTTP 端口：${port}`);
    }

    return new Promise((resolve, reject) => {
      const server = this.httpServer.listen(numericPort, () => resolve());
      server.once('error', reject);
    });
  }
}
