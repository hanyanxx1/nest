// 加载 Reflect 元数据读取能力；@Module()、@Controller() 等装饰器会写入元数据。
import 'reflect-metadata';
import express from 'express';
import { ExpressAdapter } from '../platform-express/adapters/express-adapter.js';
import { NestApplication } from './nest-application.js';
import { RouterExplorer } from './router/router-explorer.js';
import { RouterResponseController } from './router/router-response-controller.js';

// 最小版 NestFactory：从模块元数据组装 HTTP 服务并返回应用对象。
export class NestFactory {
  // 例如传入 AppModule；该模块的 @Module() 元数据包含控制器和 providers。
  static async create(moduleType: Function): Promise<NestApplication> {
    // Module 装饰器逐项写入 metadata；controllers/providers 是其中的元数据键。
    const controllerTypes = readClassMetadata(moduleType, 'controllers');
    const providerTypes = readClassMetadata(moduleType, 'providers');

    // 当前最小实现支持无参 provider，例如 AppService。
    // 使用 Map 按类查找实例，后面构造控制器时可以注入匹配的 provider。
    const providers = new Map<Function, object>();
    for (const providerType of providerTypes) {
      providers.set(providerType, Reflect.construct(providerType, []));
    }

    // 创建真实 Express 应用；路由发现仍由手写的 RouterExplorer 完成。
    const httpServer = express();
    const adapter = new ExpressAdapter(httpServer);
    const responseController = new RouterResponseController(adapter);
    const routerExplorer = new RouterExplorer();

    for (const controllerType of controllerTypes) {
      // TypeScript 装饰器元数据记录构造函数参数类型。
      // 例如 AppController 的参数类型是 AppService。
      const dependencies = readConstructorDependencies(controllerType);

      // 按构造函数参数的类型查找 provider 实例，保持注入参数的顺序。
      const argumentsForController = dependencies.map(dependency => {
        const instance = providers.get(dependency);
        if (!instance) {
          throw new Error(
            `${controllerType.name} 依赖的 ${dependency.name} 未在 providers 中注册`,
          );
        }
        return instance;
      });

      // 构造控制器实例，例如 new AppController(appService)。
      const controller = Reflect.construct(
        controllerType,
        argumentsForController,
      ) as object;

      // 扫描控制器上的 GET 路由，并交给 Express 适配器注册。
      routerExplorer.registerRoutes(
        controller,
        adapter.registerGet.bind(adapter),
        responseController,
      );
    }

    // main.ts 随后会对这个对象调用 await app.listen(port)。
    return new NestApplication(httpServer);
  }
}

// 读取模块中的类数组，并检查元数据形状；缺失的 imports/controllers/providers 按空数组处理。
function readClassMetadata(
  moduleType: Function,
  key: 'controllers' | 'providers',
): Function[] {
  const value: unknown = Reflect.getMetadata(key, moduleType);
  if (value === undefined) {
    return [];
  }
  if (
    Array.isArray(value) &&
    value.every((item): item is Function => typeof item === 'function')
  ) {
    return value;
  }
  throw new Error(`${moduleType.name} 的 ${key} 元数据必须是类数组`);
}

// 读取构造函数参数类型；例如 AppController 得到 [AppService]。
function readConstructorDependencies(controllerType: Function): Function[] {
  const value: unknown = Reflect.getMetadata(
    'design:paramtypes',
    controllerType,
  );
  if (value === undefined) {
    return [];
  }
  if (
    Array.isArray(value) &&
    value.every((item): item is Function => typeof item === 'function')
  ) {
    return value;
  }
  throw new Error(`${controllerType.name} 的构造函数依赖元数据无效`);
}
