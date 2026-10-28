import { METHOD_METADATA, PATH_METADATA } from '../../constants.js';
import { RequestMethod } from '../../enums/request-method.enum.js';

// 路由元数据：path 可以是一个路径或多个路径，例如 '/cats' 或 ['/cats', '/felines']。
export interface RequestMappingMetadata {
  path?: string | string[];
  // HTTP 方法来自 RequestMethod 枚举，例如 RequestMethod.GET 的值是 0。
  method?: RequestMethod;
}

// 未提供元数据时，默认把处理方法映射为 GET /。
const defaultMetadata = {
  [PATH_METADATA]: '/',
  [METHOD_METADATA]: RequestMethod.GET,
};

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

  return (
    // 被装饰方法所属的对象；实例方法通常是控制器的 prototype。
    target: object,
    // 方法名，例如 'findAll'。
    key: string | symbol,
    // 方法描述符；descriptor.value 是实际的处理函数。
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    // 将路径元数据写到处理函数上，供 Nest 后续扫描路由时读取。
    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
    // 将 HTTP 方法元数据写到同一个处理函数上，例如 GET（数值 0）。
    Reflect.defineMetadata(METHOD_METADATA, requestMethod, descriptor.value);
    return descriptor;
  };
};

// 固定 HTTP 方法，返回一个可接收路径的路由装饰器。
// 例如传入 RequestMethod.GET 后，createMappingDecorator('/cats') 会生成 GET /cats 装饰器。
const createMappingDecorator =
  (method: RequestMethod) =>
  (path?: string | string[]): MethodDecorator => {
    return RequestMapping({
      [PATH_METADATA]: path,
      [METHOD_METADATA]: method,
    });
  };

// 创建 GET 路由装饰器；例如 @Get('/cats') 会把方法映射为 GET /cats。
export const Get = createMappingDecorator(RequestMethod.GET);
// 创建 POST 路由装饰器；例如 @Post('/cats') 会把方法映射为 POST /cats。
export const Post = createMappingDecorator(RequestMethod.POST);
// 创建 DELETE 路由装饰器；例如 @Delete('/cats/1') 会把方法映射为 DELETE /cats/1。
export const Delete = createMappingDecorator(RequestMethod.DELETE);
// 创建 PUT 路由装饰器；例如 @Put('/cats/1') 会把方法映射为 PUT /cats/1。
export const Put = createMappingDecorator(RequestMethod.PUT);
// 创建 PATCH 路由装饰器；例如 @Patch('/cats/1') 会把方法映射为 PATCH /cats/1。
export const Patch = createMappingDecorator(RequestMethod.PATCH);
// 创建 OPTIONS 路由装饰器；例如 @Options('/cats') 会把方法映射为 OPTIONS /cats。
export const Options = createMappingDecorator(RequestMethod.OPTIONS);
// 创建 HEAD 路由装饰器；例如 @Head('/cats') 会把方法映射为 HEAD /cats。
export const Head = createMappingDecorator(RequestMethod.HEAD);
// 创建匹配所有 HTTP 方法的路由装饰器；例如 @All('/health') 会匹配该路径的所有方法。
export const All = createMappingDecorator(RequestMethod.ALL);
// 创建 SEARCH 路由装饰器；例如 @Search('/cats') 会把方法映射为 SEARCH /cats。
export const Search = createMappingDecorator(RequestMethod.SEARCH);
// 使用 QueryMethod 命名以避免与查询参数装饰器 @Query() 重名。
export const QueryMethod = createMappingDecorator(RequestMethod.QUERY);
// 创建 WebDAV PROPFIND 路由装饰器；例如 @Propfind('/files') 会映射为 PROPFIND /files。
export const Propfind = createMappingDecorator(RequestMethod.PROPFIND);
// 创建 WebDAV PROPPATCH 路由装饰器；例如 @Proppatch('/files') 会映射为 PROPPATCH /files。
export const Proppatch = createMappingDecorator(RequestMethod.PROPPATCH);
// 创建 WebDAV MKCOL 路由装饰器；例如 @Mkcol('/files') 会映射为 MKCOL /files。
export const Mkcol = createMappingDecorator(RequestMethod.MKCOL);
// 创建 WebDAV COPY 路由装饰器；例如 @Copy('/files/copy') 会映射为 COPY /files/copy。
export const Copy = createMappingDecorator(RequestMethod.COPY);
// 创建 WebDAV MOVE 路由装饰器；例如 @Move('/files/move') 会映射为 MOVE /files/move。
export const Move = createMappingDecorator(RequestMethod.MOVE);
// 创建 WebDAV LOCK 路由装饰器；例如 @Lock('/files/1') 会映射为 LOCK /files/1。
export const Lock = createMappingDecorator(RequestMethod.LOCK);
// 创建 WebDAV UNLOCK 路由装饰器；例如 @Unlock('/files/1') 会映射为 UNLOCK /files/1。
export const Unlock = createMappingDecorator(RequestMethod.UNLOCK);
