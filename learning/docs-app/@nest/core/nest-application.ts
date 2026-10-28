// 使用 Express 的应用类型描述底层 HTTP 服务，但核心应用只依赖它的 listen 能力。
import type { Application } from 'express';

export class NestApplication {
  // 保存 NestFactory 创建的 Express 应用；例如它之后会监听 3000 端口。
  constructor(private readonly httpServer: Pick<Application, 'listen'>) {}

  // 启动底层 HTTP 服务；main.ts 会传入 process.env.PORT 或默认端口 3000。
  // 返回 Promise，让 main.ts 可以像官方 Nest 一样使用 await app.listen(...)。
  listen(port: string | number): Promise<void> {
    // 环境变量中的端口是字符串；这里只接受有效的数字端口。
    const numericPort = typeof port === 'number' ? port : Number(port);
    if (
      !Number.isInteger(numericPort) ||
      numericPort < 0 ||
      numericPort > 65535
    ) {
      throw new RangeError(`无效的 HTTP 端口：${port}`);
    }

    return new Promise((resolve, reject) => {
      // Express 开始监听后调用 resolve；例如监听 3000 成功时 Promise 完成。
      const server = this.httpServer.listen(numericPort, () => resolve());

      // 端口被占用等启动错误通过 reject 抛出，不伪装成启动成功。
      server.once('error', reject);
    });
  }
}
