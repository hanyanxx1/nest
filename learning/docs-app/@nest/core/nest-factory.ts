// 加载 Reflect 元数据读取能力；@Module()、@Controller()、@Get() 等装饰器会把信息写入元数据。
// 这是 TypeScript 装饰器的必要前置条件；不加载它，后续 Reflect.getMetadata() 会返回 undefined。
import 'reflect-metadata';
import express from 'express';
import { ExpressAdapter } from '../platform-express/adapters/express-adapter.js';
import { NestApplication } from './nest-application.js';
import { RouterExplorer } from './router/router-explorer.js';
import { RouterResponseController } from './router/router-response-controller.js';

/**
 * 最小版 NestFactory：从模块的元数据出发，组装 HTTP 服务。
 *
 * 工作流程：
 * 1. 从模块的 @Module() 元数据读取控制器类和 provider 类。
 * 2. 逐一实例化 provider（例如 Service）。
 * 3. 逐一构造控制器（例如 Controller），并注入依赖的 provider 实例。
 * 4. 用路由探索器扫描控制器方法上的路由装饰器（@Get、@Post 等）。
 * 5. 把扫描出的路由注册到 Express 应用上。
 * 6. 返回 NestApplication 对象，其内部持有 Express 应用，可供 main.ts 调用 listen()。
 */
export class NestFactory {
  /**
   * 创建并初始化 Nest 应用。
   *
   * 调用示例：
   *   const app = await NestFactory.create(AppModule);
   *
   * 参数 moduleType 例如 AppModule，它应该用 @Module() 装饰，且元数据中记录了：
   *   - controllers: [AppController, CatsController, ...]
   *   - providers: [AppService, CatsService, ...]
   *
   * 返回值是 NestApplication，它包装了 Express 应用，暴露 listen() 方法。
   */
  static async create(moduleType: Function): Promise<NestApplication> {
    // 第一步：从 @Module() 装饰器写入的元数据中读取控制器类和 provider 类。
    //
    // 示例：
    //   @Module({
    //     controllers: [AppController],
    //     providers: [AppService]
    //   })
    //   export class AppModule {}
    //
    // 执行结果：
    //   controllerTypes = [AppController]
    //   providerTypes = [AppService]
    const controllerTypes = readClassMetadata(moduleType, 'controllers');
    const providerTypes = readClassMetadata(moduleType, 'providers');

    // 第二步：实例化所有 provider，按类存进 Map 以便后续查找。
    // 当前实现支持无参构造函数的 provider，例如 AppService。
    //
    // 示例：
    //   AppService 没有构造参数，new AppService() 会直接创建实例。
    //   这个实例会存在 Map 中，key 是 AppService 类，value 是 new AppService() 的结果。
    //
    // Map 形状：
    //   Map {
    //     AppService => AppService { }
    //   }
    const providers = new Map<Function, object>();
    for (const providerType of providerTypes) {
      // Reflect.construct(providerType, []) 等价于 new providerType()。
      // 第二参数 [] 是构造函数参数数组，当前都为空，表示无参调用。
      providers.set(providerType, Reflect.construct(providerType, []));
    }

    // 第三步：创建 Express 应用及相关组件。
    // 真正的 HTTP 服务由 Express 提供；我们只是在上面注册路由和响应处理。
    const httpServer = express();
    const adapter = new ExpressAdapter(httpServer);
    const responseController = new RouterResponseController(adapter);
    const routerExplorer = new RouterExplorer();

    // 第四步：逐一处理每个控制器。
    //
    // 示例处理流程（以 AppController 为例）：
    //   AppController 的构造函数签名是 constructor(private appService: AppService)，
    //   TypeScript 装饰器元数据会记录参数类型是 [AppService]。
    //
    //   我们要做的是：
    //   1. 读取这些参数类型 [AppService]。
    //   2. 从 providers Map 中查找 AppService 实例。
    //   3. 构造 new AppController(appService实例)。
    //   4. 扫描 AppController 实例上的 @Get()/@Post() 等路由装饰器。
    //   5. 把路由注册到 Express 上。
    for (const controllerType of controllerTypes) {
      // 读取构造函数参数的类型。
      // TypeScript 的 @types/node 和 reflect-metadata 会在编译时记录参数类型。
      //
      // 示例：
      //   class AppController {
      //     constructor(private appService: AppService) {}
      //   }
      //
      // 编译后，TypeScript 在 AppController 上留下元数据 'design:paramtypes': [AppService]。
      // readConstructorDependencies 会读取这个数组 [AppService]。
      const dependencies = readConstructorDependencies(controllerType);

      // 根据参数类型从 providers Map 中查找实例。
      //
      // 示例：
      //   dependencies = [AppService]
      //   循环：dependency = AppService
      //   instance = providers.get(AppService) => 此前实例化的 AppService 实例
      //
      //   如果 AppService 没在 providers 中，会抛错，告诉开发者类名和缺失的依赖。
      const argumentsForController = dependencies.map((dependency) => {
        const instance = providers.get(dependency);
        if (!instance) {
          throw new Error(
            `${controllerType.name} 依赖的 ${dependency.name} 未在 providers 中注册`,
          );
        }
        return instance;
      });

      // 用查到的 provider 实例构造控制器。
      // Reflect.construct(controllerType, argumentsForController) 等价于 new controllerType(...argumentsForController)。
      //
      // 示例：
      //   controllerType = AppController
      //   argumentsForController = [appService实例]
      //   结果 = new AppController(appService实例)
      const controller = Reflect.construct(
        controllerType,
        argumentsForController,
      ) as object;

      // 扫描控制器实例上的路由。
      // RouterExplorer 会找出所有用 @Get()、@Post() 等装饰的方法，
      // 提取它们的元数据（路径、HTTP 方法等），并逐一注册到 Express 上。
      //
      // 示例：
      //   controller 是 new AppController(appService实例)。
      //   RouterExplorer 会发现：
      //   - getCats() 方法用了 @Get('cats')，元数据是 {path: 'cats', method: GET}。
      //   - getCatsMessage() 方法用了 @Get('cats/message')，元数据是 {path: 'cats/message', method: GET}。
      //
      //   adapter 上的 get/post 回调用于分别注册 GET 和 POST 路由。
      //   responseController 是响应处理器，会被传给 RouterExplorer，
      //   在请求到来时用于把控制器方法的返回值转成 HTTP 响应。
      routerExplorer.registerRoutes(
        controller,
        {
          get: adapter.registerGet.bind(adapter),
          post: adapter.registerPost.bind(adapter),
        },
        responseController,
      );
    }

    // 第五步：返回 Nest 应用对象。
    // NestApplication 对象内部持有 Express 实例，暴露 listen() 方法。
    // main.ts 会调用 await app.listen(3000) 来启动 HTTP 服务。
    return new NestApplication(httpServer);
  }
}

/**
 * 从模块类读取指定类型的元数据。
 *
 * @param moduleType - 被 @Module() 装饰的类，例如 AppModule。
 * @param key - 要读取的元数据键，只接受 'controllers' 或 'providers'。
 *
 * @returns 类的构造函数数组；如果元数据不存在，返回空数组。
 *
 * 工作原理：
 * @Module() 装饰器在类上用 Reflect.defineMetadata(key, value, target) 写入元数据。
 * 这个函数用 Reflect.getMetadata(key, moduleType) 读取它们。
 *
 * 示例 1 - 读取控制器数组：
 *   moduleType = AppModule（用 @Module({controllers: [AppController]}) 装饰）
 *   key = 'controllers'
 *   返回值 = [AppController]（AppController 类的构造函数）
 *
 * 示例 2 - 读取 provider 数组：
 *   moduleType = AppModule（用 @Module({providers: [AppService]}) 装饰）
 *   key = 'providers'
 *   返回值 = [AppService]（AppService 类的构造函数）
 *
 * 示例 3 - 元数据不存在时：
 *   moduleType = PlainClass（没有 @Module() 装饰，也没有手动写入元数据）
 *   key = 'controllers'
 *   返回值 = []（空数组，不会报错）
 *
 * 验证机制：
 * 检查读取到的值是否为数组，以及数组中的每一项是否都是函数（类的构造函数）。
 * 如果元数据形状不对，会抛出有描述性的错误。
 */
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

/**
 * 从类的构造函数签名中读取参数类型数组。
 *
 * @param controllerType - 控制器类，例如 AppController。
 *
 * @returns 构造函数参数的类型数组；如果没有参数或元数据不存在，返回空数组。
 *
 * 工作原理：
 * TypeScript 编译器和 reflect-metadata 库会在类上记录 'design:paramtypes' 元数据。
 * 这个元数据是一个数组，包含构造函数每个参数的类型（通常是类的构造函数）。
 *
 * 示例 1 - 有一个参数的控制器：
 *   class AppController {
 *     constructor(private appService: AppService) {}
 *   }
 *
 *   返回值 = [AppService]（AppService 的类构造函数）
 *
 *   后续代码会用这个信息来：
 *   1. 查找 providers Map 中有没有 AppService 的实例。
 *   2. 把找到的 AppService 实例作为参数，调用 new AppController(appService)。
 *
 * 示例 2 - 没有参数的控制器：
 *   class SimpleController {
 *     constructor() {}
 *   }
 *
 *   返回值 = []（空数组）
 *
 *   后续代码会调用 new SimpleController()。
 *
 * 示例 3 - 多个参数的控制器：
 *   class CatsController {
 *     constructor(
 *       private catsService: CatsService,
 *       private loggingService: LoggingService
 *     ) {}
 *   }
 *
 *   返回值 = [CatsService, LoggingService]
 *
 *   后续代码会从 providers 中查找这两个类的实例，然后调用：
 *   new CatsController(catsServiceInstance, loggingServiceInstance)
 *
 * 验证机制：
 * 检查读取到的值是否为数组，数组中的每一项是否都是函数。
 * 如果构造函数签名无效，会抛出具有调试信息的错误。
 */
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
