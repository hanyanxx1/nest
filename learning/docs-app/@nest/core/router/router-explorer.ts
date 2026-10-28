/**
 * 路由探索器：扫描控制器的元数据，并组合各部分路径成最终的 HTTP 路由。
 *
 * 工作流程：
 * 1. explore() - 从控制器类的 @Controller() 元数据中读取前缀路径。
 * 2. scanMethods() - 扫描控制器原型上的所有方法，找出被 @Get()/@Post() 等装饰的方法。
 * 3. getRoutes() - 组合控制器前缀和方法路径，生成最终的完整路由。
 * 4. registerRoutes() - 把生成的路由注册到 Express 适配器。
 *
 * 当前实现只支持 GET 方法。
 */

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

/**
 * 原始路由定义：从控制器方法的装饰器元数据中直接扫描出来的信息。
 * 此时路径可能是字符串或字符串数组（方法可配置多个路径）。
 *
 * 示例：
 *   @Get('message')
 *   async getMessage() { return 'Hello'; }
 *
 *   生成的 RouteDefinition：
 *   {
 *     methodName: 'getMessage',
 *     method: RequestMethod.GET,  // 数字值，例如 0
 *     path: 'message',              // 来自 @Get('message')
 *     callback: [Function: getMessage]
 *   }
 */
interface RouteDefinition {
  methodName: string;
  method: RequestMethod;
  path: string | string[];
  callback: Function;
}

/**
 * 已组合的最终路由定义：控制器前缀和方法路径已合并，路径必定是单个字符串。
 *
 * 示例：
 * @Controller('cats')
 * export class CatsController {
 *   @Get('message')
 *   async getMessage() { ... }
 * }
 *
 * 生成的 DiscoveredRoute：
 * {
 *   methodName: 'getMessage',
 *   method: RequestMethod.GET,   // 0
 *   path: '/cats/message',         // 组合后的完整路径
 *   callback: [Function: getMessage]
 * }
 *
 * 特殊情况：
 * - @Controller() 默认路径是 '/'，@Get('/') 相对路径也是 '/'，组合结果为 '/'。
 * - @Controller('cats') + @Get('') 组合结果为 '/cats'。
 * - @Controller('api/v1') + @Get('items') 组合结果为 '/api/v1/items'。
 */
interface DiscoveredRoute {
  methodName: string;
  method: RequestMethod;
  path: string;
  callback: Function;
}

export class RouterExplorer {
  /**
   * 从控制器实例中提取 @Controller() 元数据中的路径前缀。
   *
   * @param controller - 控制器实例，例如 new CatsController()。
   * @returns 前缀路径数组。总是返回数组，即使只有一个路径。
   *
   * 工作原理：
   * @Controller() 装饰器在被装饰的类上写入两个元数据：
   * 1. CONTROLLER_WATERMARK = true  - 标记这是一个控制器
   * 2. PATH_METADATA = 前缀路径     - 存储 @Controller() 中传入的路径参数
   *
   * 示例 1 - 单一前缀（字符串）：
   *   @Controller('cats')
   *   class CatsController {}
   *
   *   输入：new CatsController()
   *   输出：['cats']
   *
   * 示例 2 - 多个前缀（字符串数组）：
   *   @Controller(['cats', 'felines'])
   *   class CatsController {}
   *
   *   输入：new CatsController()
   *   输出：['cats', 'felines']
   *
   *   后续会为每个前缀分别生成一套路由，即 /cats/... 和 /felines/...。
   *
   * 示例 3 - 默认前缀：
   *   @Controller()
   *   class AppController {}
   *
   *   输入：new AppController()
   *   输出：['/']
   *
   * 错误处理：
   * - 如果类没有 @Controller() 装饰器，会抛出明确的错误。
   * - 如果 PATH_METADATA 既不是字符串也不是字符串数组，会抛出类型错误。
   */
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

  /**
   * 扫描控制器原型上的所有方法，找出被 @Get()/@Post() 等装饰的处理方法。
   *
   * @param controller - 控制器实例。
   * @returns RouteDefinition 数组，每一项代表一个被 HTTP 装饰器标记的方法。
   *
   * 工作原理：
   * HTTP 方法装饰器（@Get、@Post 等）在被装饰的方法函数上写入元数据：
   * 1. METHOD_METADATA - HTTP 方法（数字枚举值，例如 0 表示 GET）
   * 2. PATH_METADATA - 相对路径（例如 'message'）
   *
   * 示例：
   *   @Get('message')
   *   async getMessage() {
   *     return 'Hello';
   *   }
   *
   *   输入：CatsController 的实例
   *   输出数组包含一项：
   *   {
   *     methodName: 'getMessage',
   *     method: 0,  // RequestMethod.GET
   *     path: 'message',
   *     callback: [Function: getMessage]  // 原型上的方法函数
   *   }
   *
   * 扫描过程：
   * 1. 获取实例的原型（例如 CatsController.prototype）。
   * 2. 遍历原型上的所有属性名（包括方法名）。
   * 3. 跳过 'constructor'，因为它不是业务处理方法。
   * 4. 对每个属性，检查它是否是函数。
   * 5. 在函数上查找 METHOD_METADATA；没有则说明没被装饰，跳过。
   * 6. 如果找到 METHOD_METADATA，还要查找 PATH_METADATA（路由相对路径）。
   * 7. 收集到的方法信息加入返回数组。
   *
   * 特殊情况：
   * - @Get() 无参时，PATH_METADATA 为 '/'（根相对路径）。
   * - @Get(['api', 'data']) 多路径时，PATH_METADATA 是字符串数组。
   * - constructor 和普通属性会被跳过，只收集被装饰的方法。
   */
  scanMethods(controller: object): RouteDefinition[] {
    // 实例的原型保存控制器定义的方法；实例自己的 constructor 不属于路由处理方法。
    const prototype = Object.getPrototypeOf(controller) as object;
    const routes: RouteDefinition[] = [];

    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === 'constructor') {
        continue;
      }

      // 读取原型上的方法，例如 CatsController.prototype.getMessage。
      const callback: unknown = Reflect.get(prototype, methodName);
      if (typeof callback !== 'function') {
        continue;
      }

      // 路由装饰器把 HTTP 方法写在处理函数上；普通方法没有这项 metadata。
      // 例如 @Get() 会写 METHOD_METADATA = RequestMethod.GET（值为 0）。
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
      // PATH_METADATA 存储的可能是单一字符串或字符串数组。
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

  /**
   * 组合控制器前缀与方法路径，生成最终的完整路由描述。
   *
   * @param controller - 控制器实例。
   * @returns DiscoveredRoute 数组，路径已组合成单一字符串。
   *
   * 工作原理：
   * explore() 返回前缀数组；scanMethods() 返回方法路由数组。
   * 由于前缀和方法路径都可能是多个（例如 @Controller(['cats', 'dogs']) + @Get(['list', 'all'])），
   * 需要做笛卡尔积，为每个前缀-方法路径组合生成一个最终路由。
   *
   * 路径组合算法：
   * 1. 去掉前缀和方法路径两端的斜杠，避免组合时出现 '//'。
   * 2. 过滤掉空字符串，避免组合时出现 'cats//message'。
   * 3. 如果两部分都是空（例如都是 '/'），最终路径为 '/'。
   * 4. 否则以单个斜杠连接路径片段。
   *
   * 详细示例：
   *
   * 示例 1 - 标准情况：
   *   @Controller('cats')
   *   class CatsController {
   *     @Get('message')
   *     getMessage() {}
   *   }
   *
   *   explore() -> ['cats']
   *   scanMethods() -> [{path: 'message', ...}]
   *
   *   组合过程：
   *   - 前缀 'cats' 去两端斜杠 -> 'cats'
   *   - 方法路径 'message' 去两端斜杠 -> 'message'
   *   - 两者都非空，结果 -> '/cats/message'
   *
   * 示例 2 - 根路径 + 默认方法路径：
   *   @Controller()  // 默认 '/'
   *   class AppController {
   *     @Get()  // 默认 '/'
   *     getRoot() {}
   *   }
   *
   *   explore() -> ['/']
   *   scanMethods() -> [{path: '/', ...}]
   *
   *   组合过程：
   *   - 前缀 '/' 去两端斜杠 -> ''
   *   - 方法路径 '/' 去两端斜杠 -> ''
   *   - 两者都为空，结果 -> '/'
   *
   * 示例 3 - 嵌套路径：
   *   @Controller('api/v1')
   *   class ApiController {
   *     @Get('users')
   *     getUsers() {}
   *   }
   *
   *   组合过程：
   *   - 前缀 'api/v1' 去两端斜杠 -> 'api/v1'
   *   - 方法路径 'users' 去两端斜杠 -> 'users'
   *   - 结果 -> '/api/v1/users'
   *
   * 示例 4 - 多前缀多路径（笛卡尔积）：
   *   @Controller(['cats', 'felines'])
   *   class CatsController {
   *     @Get(['list', 'all'])
   *     getList() {}
   *   }
   *
   *   explore() -> ['cats', 'felines']
   *   scanMethods() -> [{path: ['list', 'all'], ...}]
   *
   *   组合结果（4 条路由）：
   *   - /cats/list
   *   - /cats/all
   *   - /felines/list
   *   - /felines/all
   *
   * 示例 5 - 方法路径为空字符串：
   *   @Controller('cats')
   *   class CatsController {
   *     @Get('')  // 相对路径为空
   *     getCats() {}
   *   }
   *
   *   组合过程：
   *   - 前缀 'cats' 去两端斜杠 -> 'cats'
   *   - 方法路径 '' 去两端斜杠 -> ''
   *   - 只有前缀有内容，结果 -> '/cats'
   */
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
        // 统一转成数组，方便后续处理每一个。
        const methodPaths = Array.isArray(definition.path)
          ? definition.path
          : [definition.path];

        for (const methodPath of methodPaths) {
          // 去掉两端多余的斜杠，避免组合后出现 '//cats//message'。
          // 例如 '/' 变成 ''，'/cats/' 变成 'cats'，'message' 保持 'message'。
          // '/' 与空字符串会变成空片段，最终统一由下面的判断处理根路径。
          const segments = [controllerPath, methodPath]
            .map((path) => path.replace(/^\/+|\/+$/g, ''))
            .filter(Boolean);

          // 两部分都是根路径时结果为 '/'；否则以单个斜杠连接路径片段。
          // 例如：
          // - segments = [] 时（前后都是 '/'），path = '/'
          // - segments = ['cats', 'message'] 时，path = '/cats/message'
          // - segments = ['api/v1', 'users'] 时，path = '/api/v1/users'
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

  /**
   * 把扫描得到的路由注册到 HTTP 适配器（例如 Express）。
   *
   * @param controller - 控制器实例。
   * @param registerGet - 用于注册 GET 路由的回调函数，签名 (path, handler) => void。
   * @param responseController - 响应处理委托，负责把控制器方法的返回值转成 HTTP 响应。
   *
   * 工作原理：
   * 1. 调用 getRoutes() 得到所有最终路由。
   * 2. 对每条路由，检查 HTTP 方法（当前只支持 GET）。
   * 3. 用 registerGet() 在 Express 上注册该路由。
   * 4. 注册时传入 Express handler，handler 会：
   *    a. 调用控制器方法（例如 getCats()），获取业务逻辑的返回值。
   *    b. 把返回值交给 responseController.apply()，由它负责序列化和发送 HTTP 响应。
   *
   * 示例：
   *   控制器定义：
   *   @Controller('cats')
   *   class CatsController {
   *     @Get('message')
   *     getMessage() { return 'Hello'; }
   *   }
   *
   *   调用 registerRoutes(new CatsController(), registerGet, responseController) 后：
   *   - Express 上注册了 GET /cats/message
   *   - 当有 HTTP GET /cats/message 请求时，Express 会：
   *     1. 调用 getMessage.call(controller)，得到 'Hello'
   *     2. 调用 responseController.apply('Hello', response)
   *     3. 最终 HTTP 响应为 { "message": "Hello" } 或类似格式
   *
   * 当前限制：
   * - 只支持 GET 方法；若遇到 POST/PUT/DELETE 等会明确抛错。
   * - 暂不支持中间件、路由守卫等高级功能。
   */
  registerRoutes(
    controller: object,
    registerGet: (path: string, handler: Function) => unknown,
    responseController: RouterResponseController,
  ): void {
    // 例如得到 { method: RequestMethod.GET, path: '/cats/message', ... } 的路由描述。
    const routes = this.getRoutes(controller);

    for (const route of routes) {
      // 当前手写适配器只实现了 GET 注册；其他方法暂不支持，明确报错。
      if (route.method !== RequestMethod.GET) {
        throw new Error(`当前路由注册器暂不支持 HTTP 方法：${route.method}`);
      }

      // 让平台适配器注册真实 HTTP 路由；请求到达时，handler 才会执行。
      // 这个 async handler 是对 Express 路由的封装。
      registerGet(route.path, async (_request: unknown, response: unknown) => {
        // callback 是控制器原型上的方法；用 controller 作为 this 调用实例方法。
        // 例如若 callback 是 getMessage，则调用 getMessage.call(controller)。
        // 如果 getMessage() 返回字符串 'Hello'，result 就是 'Hello'。
        // 如果返回数组 [{name: 'Mimi'}]，result 就是那个数组。
        const result = await route.callback.call(controller);

        // 将控制器返回值交给 RouterResponseController，再由它委托给 ExpressAdapter.reply()。
        // responseController.apply() 会检查返回值的类型，并根据类型决定如何序列化和发送。
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
      (method) => typeof method === 'number' && method === value,
    )
  );
}
