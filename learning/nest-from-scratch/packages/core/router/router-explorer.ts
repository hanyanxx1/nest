// Controller 装饰器用 Reflect 写入元数据；这里需要 reflect-metadata 才能读取这些数据。
import 'reflect-metadata';
import {
  CONTROLLER_WATERMARK,
  METHOD_METADATA,
  PATH_METADATA,
} from '../../common/constants.js';
import { RequestMethod } from '../../common/enums/request-method.enum.js';
// 路由命中后，把控制器方法的返回值交给统一的响应委托层。
import { RouterResponseController } from './router-response-controller.js';

// 每条路由描述一个控制器方法及其装饰器元数据。
// 例如 findAll 方法上的 @Get() 对应 method: RequestMethod.GET、path: '/'。
interface RouteDefinition {
  methodName: string;
  method: RequestMethod;
  path: string | string[];
  callback: Function;
}

// 组合完成后的路由描述。
// 例如控制器前缀是 'cats'、方法路径是 'message'，最终 path 是 '/cats/message'。
interface DiscoveredRoute {
  methodName: string;
  method: RequestMethod;
  path: string;
  callback: Function;
}

export class RouterExplorer {
  // 接收一个控制器实例，例如 catsController 是 CatsController 的实例。
  // 返回路径数组，例如 @Controller('cats') 会得到 ['cats']。
  explore(controller: object): string[] {
    // 通过实例的 constructor 找到它对应的控制器类，例如 CatsController。
    const controllerType = controller.constructor;

    // Controller 装饰器会在类上写入 CONTROLLER_WATERMARK 元数据。
    // true 表示这个类使用了 @Controller()；未装饰时读取结果为 undefined。
    const isController = Reflect.getMetadata(
      CONTROLLER_WATERMARK,
      controllerType,
    );

    // 控制器实例必须来自带有 @Controller() 的类，否则无法读取有效的路由前缀。
    if (!isController) {
      throw new Error(`${controllerType.name} 缺少 @Controller() 装饰器`);
    }

    // 读取 @Controller() 写入的路径元数据：
    // @Controller('cats') 对应 'cats'，@Controller() 对应默认路径 '/'。
    // 先标为 unknown，之后检查实际类型，避免未经验证就把元数据当成字符串使用。
    const controllerPath: unknown = Reflect.getMetadata(
      PATH_METADATA,
      controllerType,
    );

    // 单个前缀也统一转换成数组，后续可用同一套逻辑处理一个或多个前缀。
    // 例如 'cats' 转成 ['cats']。
    if (typeof controllerPath === 'string') {
      return [controllerPath];
    }

    // Controller 也可以配置多个路径，例如 @Controller(['cats', 'felines'])。
    // every 会检查数组中的每个元素都是字符串；检查通过后返回原数组。
    if (
      Array.isArray(controllerPath) &&
      controllerPath.every((path): path is string => typeof path === 'string')
    ) {
      return controllerPath;
    }

    // 元数据既不是字符串，也不是字符串数组时，明确报错，不静默使用错误路径。
    throw new Error(
      `${controllerType.name} 的控制器路径必须是字符串或字符串数组`,
    );
  }

  // 扫描控制器原型，只收集带 HTTP 方法元数据的处理方法。
  // 例如 CatsController 上的 findAll() 被 @Get('message') 装饰时，
  // 结果中会有 { methodName: 'findAll', method: RequestMethod.GET, path: 'message' }。
  scanMethods(controller: object): RouteDefinition[] {
    // 实例的原型保存控制器定义的方法；实例自己的 constructor 不属于路由处理方法。
    const prototype = Object.getPrototypeOf(controller) as object;
    const routes: RouteDefinition[] = [];

    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === 'constructor') {
        continue;
      }

      // 读取原型上的方法，例如 CatsController.prototype.findAll。
      const callback: unknown = Reflect.get(prototype, methodName);
      if (typeof callback !== 'function') {
        continue;
      }

      // 路由装饰器把 HTTP 方法写在处理函数上；普通方法没有这项 metadata。
      const methodValue: unknown = Reflect.getMetadata(
        METHOD_METADATA,
        callback,
      );
      if (methodValue === undefined) {
        continue;
      }
      if (!isRequestMethod(methodValue)) {
        throw new Error(`${methodName} 的 HTTP 方法元数据无效`);
      }

      // 同一个装饰器也会把路径写在处理函数上，例如 @Get('message') 对应 'message'。
      const pathValue: unknown = Reflect.getMetadata(PATH_METADATA, callback);
      let path: string | string[];
      if (typeof pathValue === 'string') {
        path = pathValue;
      } else if (
        Array.isArray(pathValue) &&
        pathValue.every((item): item is string => typeof item === 'string')
      ) {
        path = pathValue;
      } else {
        throw new Error(`${methodName} 的路由路径元数据无效`);
      }

      // 保留方法名、HTTP 方法、路径和原始处理函数，供后续步骤注册路由。
      routes.push({
        methodName,
        method: methodValue,
        path,
        callback,
      });
    }

    return routes;
  }

  // 将控制器前缀与每个处理方法上的路径组合成最终路由。
  // 例如 @Controller('cats') + @Get('message') 得到 GET /cats/message。
  getRoutes(controller: object): DiscoveredRoute[] {
    // explore() 返回控制器前缀数组；例如 @Controller('cats') 得到 ['cats']。
    const controllerPaths = this.explore(controller);

    // scanMethods() 返回带有 @Get() 等 HTTP 装饰器的方法及其原始路径。
    const methodDefinitions = this.scanMethods(controller);

    const routes: DiscoveredRoute[] = [];

    // 控制器和方法都允许配置多个路径，因此需要组合每一种前缀与方法路径。
    for (const controllerPath of controllerPaths) {
      for (const definition of methodDefinitions) {
        // @Get() 的路径可能是 '/'，@Get(['one', 'two']) 则可能是路径数组。
        const methodPaths = Array.isArray(definition.path)
          ? definition.path
          : [definition.path];

        for (const methodPath of methodPaths) {
          // 去掉两端多余的斜杠，避免组合后出现 '//cats//message'。
          // '/' 与空字符串会变成空片段，最终统一由下面的判断处理根路径。
          const segments = [controllerPath, methodPath]
            .map(path => path.replace(/^\/+|\/+$/g, ''))
            .filter(Boolean);

          // 两部分都是根路径时结果为 '/'；否则以单个斜杠连接路径片段。
          const path = segments.length === 0 ? '/' : `/${segments.join('/')}`;

          // 保留原方法名和处理函数，后续注册路由时还需要它们。
          routes.push({
            methodName: definition.methodName,
            method: definition.method,
            path,
            callback: definition.callback,
          });
        }
      }
    }

    return routes;
  }

  // 把扫描得到的路由注册到 HTTP 适配器。
  // 当前先只支持 GET；例如 GET /cats 会注册到 Express 的 app.get()。
  registerRoutes(
    controller: object,
    registerGet: (path: string, handler: Function) => unknown,
    responseController: RouterResponseController,
  ): void {
    // 例如得到 { method: RequestMethod.GET, path: '/cats', ... } 的路由描述。
    const routes = this.getRoutes(controller);

    for (const route of routes) {
      // 当前手写适配器只实现了 GET 注册；其他方法暂不支持，明确报错。
      if (route.method !== RequestMethod.GET) {
        throw new Error(`当前路由注册器暂不支持 HTTP 方法：${route.method}`);
      }

      // 让平台适配器注册真实 HTTP 路由；请求到达时，handler 才会执行。
      registerGet(route.path, async (_request: unknown, response: unknown) => {
        // callback 是控制器原型上的方法；用 controller 作为 this 调用实例方法。
        // 例如 findAll() 返回 [{ name: 'Mimi' }]。
        const result = await route.callback.call(controller);

        // 将控制器返回值交给 RouterResponseController，再由它委托给 ExpressAdapter.reply()。
        return responseController.apply(result, response);
      });
    }
  }
}

// 数字枚举的运行时对象也包含反向映射的字符串；这里只接受有效的数字枚举值。
function isRequestMethod(value: unknown): value is RequestMethod {
  return (
    typeof value === 'number' &&
    Object.values(RequestMethod).some(
      method => typeof method === 'number' && method === value,
    )
  );
}
