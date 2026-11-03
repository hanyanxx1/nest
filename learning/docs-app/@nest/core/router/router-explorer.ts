/** 扫描控制器路由元数据，组合路径并注册到 HTTP 适配器。 */

import 'reflect-metadata';
import {
  CONTROLLER_WATERMARK,
  METHOD_METADATA,
  PATH_METADATA,
  PARAM_DECORATORS_METADATA,
  HTTP_CODE_METADATA,
  HOST_METADATA,
} from '../../common/constants.js';
import { RequestMethod } from '../../common/enums/request-method.enum.js';
import { RouterResponseController } from './router-response-controller.js';

interface RouteDefinition {
  methodName: string;
  method: RequestMethod;
  path: string | string[];
  callback: Function;
  target: object;
}

interface DiscoveredRoute {
  methodName: string;
  method: RequestMethod;
  path: string;
  callback: Function;
  target: object;
  host?: string;
}

interface ParamDecoratorInfo {
  decorator: string;
  options?: {
    name?: string;
    passthrough?: boolean;
  };
}

interface ParamResolverContext {
  request: unknown;
  response: unknown;
  next: unknown;
}

type ParamResolver = (context: ParamResolverContext, name?: string) => unknown;

const PARAM_RESOLVERS: Partial<Record<string, ParamResolver>> = {
  Res: ({ response }) => response,
  Req: ({ request }) => request,
  Next: ({ next }) => next,
  Param: ({ request }, name) => {
    const params = (request as { params: Record<string, string> }).params;
    return getNamedValue(params, name);
  },
  Query: ({ request }, name) => {
    const query = (request as { query: Record<string, string> }).query;
    return getNamedValue(query, name);
  },
  Body: ({ request }, name) => {
    const body = (
      request as {
        body: Record<string, unknown> | null | undefined;
      }
    ).body;

    if (name === undefined || body === undefined || body === null) {
      return body;
    }

    return body[name];
  },
  Headers: ({ request }, name) => {
    const headers = (
      request as {
        headers: Record<string, string | string[] | undefined>;
      }
    ).headers;

    return name === undefined ? headers : headers[name.toLowerCase()];
  },
  Ip: ({ request }) => (request as { ip: string }).ip,
  HostParam: ({ request }, name) => {
    const hosts = (request as { hosts?: Record<string, string> }).hosts;
    return hosts === undefined ? undefined : getNamedValue(hosts, name);
  },
  Session: ({ request }) => (request as { session?: unknown }).session,
  // cookie-parser 会把解析结果放到 request.cookies；没有该 middleware 时为 undefined。
  Cookies: ({ request }, name) => {
    const cookies = (request as { cookies?: Record<string, string> }).cookies;
    return cookies === undefined ? undefined : getNamedValue(cookies, name);
  },
};

function getNamedValue<T>(source: Record<string, T>, name?: string): unknown {
  return name === undefined ? source : source[name];
}

export class RouterExplorer {
  /** 读取 @Controller() 设置的路径前缀。 */
  explore(controller: object): string[] {
    const controllerType = controller.constructor;
    const isController = Reflect.getMetadata(CONTROLLER_WATERMARK, controllerType);

    if (!isController) {
      throw new Error(`${controllerType.name} 缺少 @Controller() 装饰器`);
    }

    const controllerPath: unknown = Reflect.getMetadata(PATH_METADATA, controllerType);

    if (typeof controllerPath === 'string') {
      return [controllerPath];
    }

    if (Array.isArray(controllerPath) && controllerPath.every((path): path is string => typeof path === 'string')) {
      return controllerPath;
    }

    throw new Error(`${controllerType.name} 的控制器路径必须是字符串或字符串数组`);
  }

  /** 收集控制器中声明了 HTTP 方法元数据的方法。 */
  scanMethods(controller: object): RouteDefinition[] {
    const prototype = Object.getPrototypeOf(controller) as object;
    const routes: RouteDefinition[] = [];

    for (const methodName of Object.getOwnPropertyNames(prototype)) {
      if (methodName === 'constructor') {
        continue;
      }

      const callback: unknown = Reflect.get(prototype, methodName);
      if (typeof callback !== 'function') {
        continue;
      }

      const methodValue: unknown = Reflect.getMetadata(METHOD_METADATA, callback);
      if (methodValue === undefined) {
        continue;
      }
      if (!isRequestMethod(methodValue)) {
        throw new Error(`${methodName} 的 HTTP 方法元数据无效`);
      }

      const pathValue: unknown = Reflect.getMetadata(PATH_METADATA, callback);
      let path: string | string[];
      if (typeof pathValue === 'string') {
        path = pathValue;
      } else if (Array.isArray(pathValue) && pathValue.every((item): item is string => typeof item === 'string')) {
        path = pathValue;
      } else {
        throw new Error(`${methodName} 的路由路径元数据无效`);
      }

      routes.push({
        methodName,
        method: methodValue,
        path,
        callback,
        target: prototype,
      });
    }

    return routes;
  }

  /** 组合控制器前缀和方法路径，生成完整路由。 */
  getRoutes(controller: object): DiscoveredRoute[] {
    const controllerPaths = this.explore(controller);
    const methodDefinitions = this.scanMethods(controller);
    const hostValue: unknown = Reflect.getMetadata(HOST_METADATA, controller.constructor);

    if (hostValue !== undefined && typeof hostValue !== 'string') {
      throw new Error('控制器的 host 元数据必须是字符串');
    }

    const host = hostValue;
    const routes: DiscoveredRoute[] = [];

    for (const controllerPath of controllerPaths) {
      for (const definition of methodDefinitions) {
        const methodPaths = Array.isArray(definition.path) ? definition.path : [definition.path];

        for (const methodPath of methodPaths) {
          const segments = [controllerPath, methodPath].map((path) => path.replace(/^\/+|\/+$/g, '')).filter(Boolean);

          const path = segments.length === 0 ? '/' : `/${segments.join('/')}`;

          routes.push({
            methodName: definition.methodName,
            method: definition.method,
            path,
            callback: definition.callback,
            target: definition.target,
            host,
          });
        }
      }
    }

    return routes;
  }

  /** 注册路由，并连接参数注入与响应处理流程。 */
  registerRoutes(
    controller: object,
    registerRoute: {
      get: (path: string, handler: Function) => unknown;
      post: (path: string, handler: Function) => unknown;
    },
    responseController: RouterResponseController,
  ): void {
    const routes = this.getRoutes(controller);

    for (const route of routes) {
      const register =
        route.method === RequestMethod.GET
          ? registerRoute.get
          : route.method === RequestMethod.POST
            ? registerRoute.post
            : undefined;

      if (!register) {
        throw new Error(`当前路由注册器暂不支持 HTTP 方法：${route.method}`);
      }

      register(route.path, async (request: unknown, response: unknown, next: unknown) => {
        if (route.host !== undefined) {
          const hostParams = extractHostParams(route.host, request);

          if (hostParams === undefined) {
            (next as () => void)();
            return;
          }

          (request as { hosts?: Record<string, string> }).hosts = hostParams;
        }

        const paramDecorators = (Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, route.target, route.methodName) ||
          {}) as Record<number, ParamDecoratorInfo>;
        const args: any[] = [];

        for (const [paramIndex, paramInfo] of Object.entries(paramDecorators)) {
          const resolve = PARAM_RESOLVERS[paramInfo.decorator];
          if (!resolve) {
            throw new Error(`当前不支持参数装饰器：${paramInfo.decorator}`);
          }

          args[Number(paramIndex)] = resolve({ request, response, next }, paramInfo.options?.name);
        }

        const result = await route.callback.call(controller, ...args);

        const httpCode: number | undefined = Reflect.getMetadata(HTTP_CODE_METADATA, route.callback);
        const statusCode = httpCode ?? (route.method === RequestMethod.POST ? 201 : undefined);

        return responseController.apply(result, response, statusCode, paramDecorators);
      });
    }
  }
}

function extractHostParams(host: string, request: unknown): Record<string, string> | undefined {
  const hostname = (request as { hostname?: unknown }).hostname;

  if (typeof hostname !== 'string') {
    return undefined;
  }

  const expectedParts = host.toLowerCase().split('.');
  const actualParts = hostname.toLowerCase().split('.');

  if (expectedParts.length !== actualParts.length) {
    return undefined;
  }

  const hostParams: Record<string, string> = {};

  for (const [index, expectedPart] of expectedParts.entries()) {
    const actualPart = actualParts[index];

    if (actualPart === undefined) {
      return undefined;
    }

    if (expectedPart.startsWith(':')) {
      const name = expectedPart.slice(1);

      if (name.length === 0 || actualPart.length === 0) {
        return undefined;
      }

      hostParams[name] = actualPart;
    } else if (expectedPart !== actualPart) {
      return undefined;
    }
  }

  return hostParams;
}

function isRequestMethod(value: unknown): value is RequestMethod {
  return (
    typeof value === 'number' &&
    Object.values(RequestMethod).some((method) => typeof method === 'number' && method === value)
  );
}
