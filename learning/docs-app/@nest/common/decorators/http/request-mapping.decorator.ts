import { METHOD_METADATA, PATH_METADATA } from '../../constants.js';
import { RequestMethod } from '../../enums/request-method.enum.js';

/**
 * 路由装饰器的元数据结构。
 *
 * @Get('cats')、@Post('/users')、@Delete('') 等装饰器会传入这样的对象。
 * 当手动调用 RequestMapping() 时，可以同时指定 path 和 method。
 * 当通过便捷装饰器如 @Get 调用时，method 已由工厂确定，path 由用户传入。
 */
export interface RequestMappingMetadata {
  /**
   * 路由的相对路径。可以是单一字符串或字符串数组（表示多个等效路径）。
   *
   * 示例：
   * - path: 'cats' - 单个路径
   * - path: ['cats', 'felines'] - 多个等效路径（都映射到同一处理方法）
   * - path: '' 或 '/' - 根路径
   * - path: undefined - 未指定时使用默认值 '/'
   */
  path?: string | string[];
  /**
   * HTTP 方法，从 RequestMethod 枚举中取值。
   *
   * 示例：
   * - method: RequestMethod.GET - 数值 0，表示 GET 请求
   * - method: RequestMethod.POST - 数值 1，表示 POST 请求
   * - method: RequestMethod.DELETE - 数值 3，表示 DELETE 请求
   * - method: undefined - 未指定时使用默认值 RequestMethod.GET
   */
  method?: RequestMethod;
}

/**
 * 未提供任何元数据时的默认行为。
 * 例如 @Get() 无参调用时，会使用这个默认：GET /
 */
const defaultMetadata = {
  [PATH_METADATA]: '/',
  [METHOD_METADATA]: RequestMethod.GET,
};

/**
 * 通用路由装饰器工厂。
 *
 * 这是所有具体路由装饰器（@Get、@Post、@Delete 等）的底层实现。
 * 它负责：
 * 1. 处理元数据的读取和默认值补全。
 * 2. 使用 Reflect.defineMetadata() 把路由信息写到被装饰的方法函数上。
 *
 * @param metadata - 路由元数据对象，包含 path 和 method。若不传，使用默认值 GET /
 * @returns MethodDecorator - TypeScript 方法装饰器函数
 *
 * 装饰器工厂工作流程（以 @Get('cats') 为例）：
 *
 * 第一阶段 - 工厂执行（编译时，装饰器工厂被调用时）：
 *   @Get('cats') 实际调用 createMappingDecorator(RequestMethod.GET)('cats')
 *   这会执行：
 *   1. createMappingDecorator(RequestMethod.GET) 返回一个函数
 *   2. 该函数被调用 ('cats')，执行 RequestMapping({path: 'cats', method: RequestMethod.GET})
 *   3. RequestMapping 工厂完成元数据处理，返回真正的装饰器函数 (target, key, descriptor) => {...}
 *
 * 第二阶段 - 装饰器应用（运行时，TypeScript 在类定义时会自动调用装饰器）：
 *   返回的装饰器函数被应用到实际的方法上：
 *   - target: AppController.prototype（控制器类的原型）
 *   - key: 'getCats'（方法名，字符串）
 *   - descriptor: PropertyDescriptor，其中 descriptor.value 是实际的方法函数
 *
 *   装饰器函数在此时：
 *   1. 用 Reflect.defineMetadata() 把路由元数据写到 descriptor.value（方法函数）上
 *   2. 返回 descriptor，TypeScript 框架接收并继续类的定义
 *
 * 示例走完整过程：
 *
 * 代码：
 *   class CatsController {
 *     @Get('message')
 *     getCatsMessage() { return 'Hello'; }
 *   }
 *
 * 工厂阶段：
 *   @Get('message') === createMappingDecorator(RequestMethod.GET)('message')
 *   创建一个装饰器函数，其中 path = 'message', method = RequestMethod.GET
 *
 * 应用阶段：
 *   装饰器函数被调用时：
 *   - target = CatsController.prototype
 *   - key = 'getCatsMessage'
 *   - descriptor.value = getCatsMessage 的原始方法函数
 *
 *   执行：
 *   Reflect.defineMetadata(PATH_METADATA, 'message', descriptor.value)
 *   Reflect.defineMetadata(METHOD_METADATA, 0, descriptor.value)  // 0 是 GET 的值
 *
 *   之后当 RouterExplorer.scanMethods() 扫描控制器原型时：
 *   const callback = CatsController.prototype.getCatsMessage
 *   const path = Reflect.getMetadata(PATH_METADATA, callback)  // 读到 'message'
 *   const method = Reflect.getMetadata(METHOD_METADATA, callback)  // 读到 0
 */
export const RequestMapping = (
  // 例如 RequestMapping({ path: '/cats', method: RequestMethod.POST })。
  // 不传参数时使用上面的 GET / 默认值。
  metadata: RequestMappingMetadata = defaultMetadata,
): MethodDecorator => {
  // 读取调用者提供的路由路径；可能是字符串、字符串数组或 undefined。
  const pathMetadata = metadata[PATH_METADATA];
  // 没有路径或路径为空时，使用根路径 '/'。
  const path = pathMetadata && pathMetadata.length ? pathMetadata : '/';
  // 读取 HTTP 方法；未提供时默认 GET。GET 的枚举值为 0。
  const requestMethod = metadata[METHOD_METADATA] || RequestMethod.GET;

  // 返回真正的 TypeScript 方法装饰器函数。
  // TypeScript 编译器会在类定义时自动调用这个函数，传入被装饰方法的信息。
  return (
    // target: 被装饰方法所在的对象。
    // 对于实例方法（如控制器方法），target 是类的原型，例如 AppController.prototype。
    target: object,
    // key: 被装饰方法的名称，字符串或 Symbol。
    // 例如如果装饰的是 getCats() 方法，key = 'getCats'。
    key: string | symbol,
    // descriptor: 方法的属性描述符（Property Descriptor）。
    // 这是 Object.defineProperty() 使用的标准 TypeScript 接口。
    // 其中 descriptor.value 是实际的方法函数（即 getCats 函数本身）。
    // 通过修改 descriptor，我们可以改变方法的行为（例如添加拦截器）。
    // 当前实现只在 descriptor.value 上写元数据，不修改方法行为。
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    // 将路由相对路径元数据写到处理函数上，供后续 RouterExplorer.scanMethods() 读取。
    // 例如 @Get('message') 会在方法函数上记录 PATH_METADATA = 'message'。
    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);

    // 将 HTTP 方法元数据写到同一个处理函数上，例如 GET（数值 0）。
    // 供后续 RouterExplorer 判断这是哪种 HTTP 方法的处理器。
    Reflect.defineMetadata(METHOD_METADATA, requestMethod, descriptor.value);

    // 返回修改后的描述符。TypeScript 框架会用这个新的描述符重新定义该方法。
    // 当前实现中，我们只是返回原描述符，没有修改方法的行为，只是在上面贴了元数据标签。
    return descriptor;
  };
};

/**
 * 创建固定 HTTP 方法的路由装饰器工厂。
 *
 * 这是一个高阶函数，用于生成 @Get、@Post、@Delete 等具体装饰器。
 *
 * @param method - HTTP 方法，例如 RequestMethod.GET、RequestMethod.POST
 * @returns 一个装饰器工厂函数，接收路径参数，返回实际的方法装饰器
 *
 * 使用示例：
 *
 * const Get = createMappingDecorator(RequestMethod.GET)
 *
 * // 之后可以这样用：
 * @Get('cats')  // 相当于 Get('cats')()，返回装饰器函数
 * getCats() {}
 *
 * // 或者提供多个路径
 * @Get(['list', 'all'])
 * getAllList() {}
 *
 * 内部工作流程：
 * 1. createMappingDecorator(RequestMethod.GET) 被调用，返回一个函数
 * 2. 该函数 (path?: string | string[]) => 又返回一个装饰器函数
 * 3. 装饰器函数被 TypeScript 在类定义时应用到方法上
 *
 * 这样设计的好处：
 * - @Get('cats') 语法简洁，不用每次都传 method 参数
 * - 所有 HTTP 方法装饰器共用同一套底层逻辑（RequestMapping）
 * - 添加新的 HTTP 方法时，只需一行代码（如下面的 export const Post = ...）
 */
const createMappingDecorator =
  (method: RequestMethod) =>
  (path?: string | string[]): MethodDecorator => {
    return RequestMapping({
      [PATH_METADATA]: path,
      [METHOD_METADATA]: method,
    });
  };

/**
 * GET 路由装饰器。
 *
 * 用法示例：
 *   @Get('cats')
 *   getCats() { return [...]; }
 *
 *   @Get()  // 无参，默认 '/'
 *   getRoot() { return {}; }
 *
 *   @Get(['list', 'all'])  // 多路径
 *   getAll() { return [...]; }
 *
 * 最终结果：
 * - GET /cats（相对于控制器前缀）
 * - GET /（根路径）
 * - GET /list 和 GET /all（同一方法，两个路径）
 */
export const Get = createMappingDecorator(RequestMethod.GET);

/**
 * POST 路由装饰器。
 *
 * 用法示例：
 *   @Post('cats')
 *   createCat() { return {id: 1, name: 'Mimi'}; }
 *
 * 最终结果：POST /cats（相对于控制器前缀）
 */
export const Post = createMappingDecorator(RequestMethod.POST);

/**
 * DELETE 路由装饰器。
 *
 * 用法示例：
 *   @Delete(':id')
 *   deleteCat(id: string) { return {deleted: true}; }
 *
 * 最终结果：DELETE /:id（相对于控制器前缀）
 */
export const Delete = createMappingDecorator(RequestMethod.DELETE);

/**
 * PUT 路由装饰器。
 *
 * 用法示例：
 *   @Put(':id')
 *   updateCat(id: string, body: any) { return {id, ...body}; }
 *
 * 最终结果：PUT /:id（相对于控制器前缀）
 */
export const Put = createMappingDecorator(RequestMethod.PUT);

/**
 * PATCH 路由装饰器。
 *
 * 用法示例：
 *   @Patch(':id')
 *   patchCat(id: string, body: any) { return {id, ...body}; }
 *
 * 最终结果：PATCH /:id（相对于控制器前缀）
 */
export const Patch = createMappingDecorator(RequestMethod.PATCH);

/**
 * OPTIONS 路由装饰器。通常用于 CORS 预检请求。
 *
 * 用法示例：
 *   @Options('/')
 *   getOptions() { return {}; }
 *
 * 最终结果：OPTIONS /（相对于控制器前缀）
 */
export const Options = createMappingDecorator(RequestMethod.OPTIONS);

/**
 * HEAD 路由装饰器。类似 GET，但不返回响应体。
 *
 * 用法示例：
 *   @Head('health')
 *   checkHealth() { return {}; }
 *
 * 最终结果：HEAD /health（相对于控制器前缀）
 */
export const Head = createMappingDecorator(RequestMethod.HEAD);

/**
 * ALL 路由装饰器。匹配所有 HTTP 方法的请求。
 *
 * 用法示例：
 *   @All('catch-all')
 *   handleAll() { return {}; }
 *
 * 最终结果：所有 HTTP 方法都可以访问 /catch-all（相对于控制器前缀）
 */
export const All = createMappingDecorator(RequestMethod.ALL);

/**
 * SEARCH 路由装饰器。部分框架或客户端支持的非标准 HTTP 方法。
 *
 * 用法示例：
 *   @Search('query')
 *   search(params: any) { return [...]; }
 */
export const Search = createMappingDecorator(RequestMethod.SEARCH);

/**
 * QUERY 路由装饰器（QueryMethod）。
 *
 * 注意：命名为 QueryMethod 而非 Query，避免与参数装饰器 @Query() 重名。
 *
 * 用法示例：
 *   @QueryMethod('params')
 *   queryParams() { return {...}; }
 */
export const QueryMethod = createMappingDecorator(RequestMethod.QUERY);

/**
 * PROPFIND 路由装饰器。WebDAV 方法。
 *
 * 用法示例：
 *   @Propfind('/file')
 *   findProperties() { return {...}; }
 */
export const Propfind = createMappingDecorator(RequestMethod.PROPFIND);

/**
 * PROPPATCH 路由装饰器。WebDAV 方法。
 *
 * 用法示例：
 *   @Proppatch('/file')
 *   patchProperties() { return {...}; }
 */
export const Proppatch = createMappingDecorator(RequestMethod.PROPPATCH);

/**
 * MKCOL 路由装饰器。WebDAV 方法，创建集合。
 *
 * 用法示例：
 *   @Mkcol('/newdir')
 *   createCollection() { return {...}; }
 */
export const Mkcol = createMappingDecorator(RequestMethod.MKCOL);

/**
 * COPY 路由装饰器。WebDAV 方法。
 *
 * 用法示例：
 *   @Copy('/file/copy')
 *   copyFile() { return {...}; }
 */
export const Copy = createMappingDecorator(RequestMethod.COPY);

/**
 * MOVE 路由装饰器。WebDAV 方法。
 *
 * 用法示例：
 *   @Move('/file/move')
 *   moveFile() { return {...}; }
 */
export const Move = createMappingDecorator(RequestMethod.MOVE);

/**
 * LOCK 路由装饰器。WebDAV 方法。
 *
 * 用法示例：
 *   @Lock('/file/:id')
 *   lockFile(id: string) { return {...}; }
 */
export const Lock = createMappingDecorator(RequestMethod.LOCK);

/**
 * UNLOCK 路由装饰器。WebDAV 方法。
 *
 * 用法示例：
 *   @Unlock('/file/:id')
 *   unlockFile(id: string) { return {...}; }
 */
export const Unlock = createMappingDecorator(RequestMethod.UNLOCK);
