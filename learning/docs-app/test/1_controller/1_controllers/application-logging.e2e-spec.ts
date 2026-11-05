import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from '../../../@nest/common/index.js';
import { vi } from 'vitest';
import express from 'express';
import { NestApplication } from '../../../@nest/core/nest-application.js';
import { createServer } from 'node:http';

@Module({})
class EmptyModule {}

describe('Application initialization logs', () => {
  it('logs application startup when NestFactory.create is called', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    try {
      // 只创建应用，不调用 init；验证工厂阶段的启动日志。
      await NestFactory.create(EmptyModule);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith('Starting Nest application...');
    } finally {
      log.mockRestore();
    }
  });

  it('logs readiness once after successful initialization', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    try {
      const app = await NestFactory.create(EmptyModule);

      await app.init();
      await app.init();

      // 成功初始化应输出官方就绪文案，重复 init 不重复输出。
      expect(log.mock.calls.filter(([message]) => message === 'Nest application successfully started')).toHaveLength(1);
    } finally {
      log.mockRestore();
    }
  });

  it('does not log readiness when route registration fails', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    try {
      const app = new NestApplication(express(), () => {
        // 模拟初始化中的路由注册失败。
        throw new Error('route registration failed');
      });

      await expect(app.init()).rejects.toThrow('route registration failed');
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});

describe('Application listen logs', () => {
  it('logs and propagates an HTTP listen error', async () => {
    const httpServer = express();
    const failingServer = createServer();
    const listenError = new Error('listen EADDRINUSE');

    // 返回一个可控的 Server；等 NestApplication 注册 error 监听器后再触发错误。
    const listen = vi.spyOn(httpServer, 'listen').mockImplementation(() => {
      process.nextTick(() => failingServer.emit('error', listenError));
      return failingServer;
    });
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    try {
      const app = new NestApplication(httpServer, () => {});

      // 监听错误应被记录，并仍以原错误拒绝 Promise。
      await expect(app.listen(3000)).rejects.toBe(listenError);
      expect(error).toHaveBeenCalledWith(listenError.toString());
    } finally {
      listen.mockRestore();
      error.mockRestore();
    }
  });
});
