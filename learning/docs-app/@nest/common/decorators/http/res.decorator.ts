import 'reflect-metadata';
import { PARAM_DECORATORS_METADATA } from '../../constants.js';
export interface ResDecoratorOptions {
  passthrough?: boolean;
}

function createParamDecorator(decoratorName: string, options?: any): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    if (propertyKey === undefined) {
      return;
    }

    const existingDecorators = Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, target, propertyKey) || {};

    existingDecorators[parameterIndex] = {
      decorator: decoratorName,
      options: options || {},
    };

    Reflect.defineMetadata(PARAM_DECORATORS_METADATA, existingDecorators, target, propertyKey);
  };
}

export function Res(options?: ResDecoratorOptions): ParameterDecorator {
  return createParamDecorator('Res', options);
}

export function Req(): ParameterDecorator {
  return createParamDecorator('Req');
}

export function Next(): ParameterDecorator {
  return createParamDecorator('Next');
}

export const Request = Req;
export const Response = Res;

export function Param(options?: ParameterDecoratorOptions): ParameterDecorator;
export function Param(name?: string, options?: ParameterDecoratorOptions): ParameterDecorator;
export function Param(
  nameOrOptions?: string | ParameterDecoratorOptions,
  options?: ParameterDecoratorOptions,
): ParameterDecorator {
  if (isParameterDecoratorOptions(nameOrOptions)) {
    // @Param({ schema }) 没有 name，整个 params 对象都会被注入。
    return createParamDecorator('Param', { name: undefined, ...nameOrOptions });
  }
  // @Param('id') 或 @Param('id', { schema })。
  return createParamDecorator('Param', { name: nameOrOptions, ...options });
}

export function Query(options?: ParameterDecoratorOptions): ParameterDecorator;
export function Query(name?: string, options?: ParameterDecoratorOptions): ParameterDecorator;
export function Query(
  nameOrOptions?: string | ParameterDecoratorOptions,
  options?: ParameterDecoratorOptions,
): ParameterDecorator {
  if (isParameterDecoratorOptions(nameOrOptions)) {
    // @Query({ schema }) 没有 name，整个 query 都会被注入。
    return createParamDecorator('Query', { name: undefined, ...nameOrOptions });
  }
  // @Query('name') 或 @Query('name', { schema })。
  return createParamDecorator('Query', { name: nameOrOptions, ...options });
}

export function Headers(name?: string): ParameterDecorator {
  return createParamDecorator('Headers', { name });
}

export function Ip(): ParameterDecorator {
  return createParamDecorator('Ip');
}

export function HostParam(name?: string): ParameterDecorator {
  return createParamDecorator('HostParam', { name });
}

// @Session() 从当前请求对象中提取 session。
export function Session(): ParameterDecorator {
  return createParamDecorator('Session');
}

// @Cookies() 从请求对象中提取 cookie-parser 解析出的 Cookie；传 name 时只取该项。
export function Cookies(name?: string): ParameterDecorator {
  return createParamDecorator('Cookies', { name });
}

// @SignedCookies() 提取签名验证通过的 Cookie；传 name 时只取该项。
export function SignedCookies(name?: string): ParameterDecorator {
  return createParamDecorator('SignedCookies', { name });
}

// @RawBody() 提取未经解析的原始请求体 Buffer；需要在创建应用时开启 rawBody。
export function RawBody(options?: ParameterDecoratorOptions): ParameterDecorator {
  return createParamDecorator('RawBody', options);
}

// 参数装饰器的 options：schema 用于以后做校验，本步只记录，不执行。
export interface ParameterDecoratorOptions {
  schema?: unknown;
  // 管道可以是类，也可以是实例；本步只记录，执行留到后面。
  pipes?: unknown[];
}

// 区分 @Body('name') 与 @Body({ schema })：对象且不是字符串，就当作 options。
function isParameterDecoratorOptions(value: unknown): value is ParameterDecoratorOptions {
  return typeof value === 'object' && value !== null;
}

export function Body(options?: ParameterDecoratorOptions): ParameterDecorator;
export function Body(name?: string, options?: ParameterDecoratorOptions): ParameterDecorator;
export function Body(
  nameOrOptions?: string | ParameterDecoratorOptions,
  options?: ParameterDecoratorOptions,
): ParameterDecorator {
  if (isParameterDecoratorOptions(nameOrOptions)) {
    // @Body({ schema }) 没有 name，整个 body 都会被注入。
    return createParamDecorator('Body', { name: undefined, ...nameOrOptions });
  }
  // @Body('name') 或 @Body('name', { schema })。
  return createParamDecorator('Body', { name: nameOrOptions, ...options });
}
