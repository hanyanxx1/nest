// 加载 Reflect 元数据读取能力；@Module()、@Controller()、@Get() 等装饰器会把信息写入元数据。
// 这是 TypeScript 装饰器的必要前置条件；不加载它，后续 Reflect.getMetadata() 会返回 undefined。
import 'reflect-metadata';
import express from 'express';
import { ExpressAdapter } from '../platform-express/adapters/express-adapter.js';
import { NestApplication } from './nest-application.js';
import { RouterExplorer } from './router/router-explorer.js';
import { RouterResponseController } from './router/router-response-controller.js';

export class NestFactory {
  // options.rawBody 为 true 时，保留原始请求体，供 @RawBody() 读取。
  static async create(moduleType: Function, options: { rawBody?: boolean } = {}): Promise<NestApplication> {
    const controllerTypes = readClassMetadata(moduleType, 'controllers');
    const providerTypes = readClassMetadata(moduleType, 'providers');

    const providers = new Map<Function, object>();
    for (const providerType of providerTypes) {
      providers.set(providerType, Reflect.construct(providerType, []));
    }

    const httpServer = express();
    httpServer.use(
      express.json({
        // verify 在解析前拿到原始字节；开启 rawBody 时存到 request.rawBody。
        verify: options.rawBody
          ? (request, _response, buffer) => {
              (request as { rawBody?: Buffer }).rawBody = buffer;
            }
          : undefined,
      }),
    );

    const adapter = new ExpressAdapter(httpServer);
    const responseController = new RouterResponseController(adapter);
    const routerExplorer = new RouterExplorer();

    // 控制器实例化仍在 create() 里，路由注册推迟到 app.init()。
    const registerRoutes = (): void => {
      for (const controllerType of controllerTypes) {
        const dependencies = readConstructorDependencies(controllerType);

        const argumentsForController = dependencies.map((dependency) => {
          const instance = providers.get(dependency);
          if (!instance) {
            throw new Error(`${controllerType.name} 依赖的 ${dependency.name} 未在 providers 中注册`);
          }
          return instance;
        });

        const controller = Reflect.construct(controllerType, argumentsForController) as object;

        routerExplorer.registerRoutes(
          controller,
          {
            get: adapter.registerGet.bind(adapter),
            post: adapter.registerPost.bind(adapter),
          },
          responseController,
        );
      }
    };

    return new NestApplication(httpServer, registerRoutes);
  }
}

function readClassMetadata(moduleType: Function, key: 'controllers' | 'providers'): Function[] {
  const value: unknown = Reflect.getMetadata(key, moduleType);
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value) && value.every((item): item is Function => typeof item === 'function')) {
    return value;
  }
  throw new Error(`${moduleType.name} 的 ${key} 元数据必须是类数组`);
}

function readConstructorDependencies(controllerType: Function): Function[] {
  const value: unknown = Reflect.getMetadata('design:paramtypes', controllerType);
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value) && value.every((item): item is Function => typeof item === 'function')) {
    return value;
  }
  throw new Error(`${controllerType.name} 的构造函数依赖元数据无效`);
}
