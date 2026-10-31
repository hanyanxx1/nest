import 'reflect-metadata';
import { PARAM_DECORATORS_METADATA } from '../../constants.js';

/**
 * @Res() 装饰器 - 参数装饰器
 * 用途：让 Nest 注入 Express 的 Response 对象到方法参数中。
 * 这样开发者可以直接操纵 HTTP 响应（设置状态码、响应头、发送数据等）。
 */
export interface ResDecoratorOptions {
  /**
   * 是否允许方法的返回值被 Nest 处理。
   * false（默认）：开发者完全控制响应，方法返回值被忽略
   * true：既使用 Response 对象，也处理方法返回值
   */
  passthrough?: boolean;
}

/**
 * 创建参数装饰器的通用工厂。
 * 用于为参数写入装饰器元数据。
 *
 * @param decoratorName - 装饰器的名称（'Res', 'Req', 'Param' 等）
 * @param options - 装饰器的配置选项（如 passthrough）
 * @returns ParameterDecorator
 */
function createParamDecorator(
  decoratorName: string,
  options?: any,
): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    // propertyKey 在参数装饰器中可能是 undefined（当装饰静态成员时）
    // 但在实例方法的参数上，propertyKey 必定是字符串或 symbol
    if (propertyKey === undefined) {
      return;
    }

    // 获取方法上已存在的参数装饰器元数据
    const existingDecorators =
      Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, target, propertyKey) ||
      {};

    // 添加当前参数的装饰器信息
    existingDecorators[parameterIndex] = {
      decorator: decoratorName,
      options: options || {},
    };

    // 写回到方法上
    Reflect.defineMetadata(
      PARAM_DECORATORS_METADATA,
      existingDecorators,
      target,
      propertyKey,
    );
  };
}

/**
 * @Res() 装饰器 - 注入 Express Response 对象
 */
export function Res(options?: ResDecoratorOptions): ParameterDecorator {
  return createParamDecorator('Res', options);
}

/**
 * @Req() 装饰器 - 注入 Express Request 对象
 */
export function Req(): ParameterDecorator {
  return createParamDecorator('Req');
}

/**
 * @Next() 装饰器 - 注入 Express 的 next 回调。
 */
export function Next(): ParameterDecorator {
  return createParamDecorator('Next');
}

export const Request = Req;

/**
 * @Param() 装饰器 - 注入参数名
 */
export function Param(name?: string): ParameterDecorator {
  return createParamDecorator('Param', { name });
}

/**
 * @Query() 装饰器 - 注入全部或指定的查询参数
 */
export function Query(name?: string): ParameterDecorator {
  return createParamDecorator('Query', { name });
}

/**
 * @Body() 装饰器 - 注入整个请求体或其中指定的属性
 */
export function Body(name?: string): ParameterDecorator {
  return createParamDecorator('Body', { name });
}

/**
 * @Headers() 装饰器 - 注入全部或指定的请求头
 */
export function Headers(name?: string): ParameterDecorator {
  return createParamDecorator('Headers', { name });
}

/**
 * @Ip() 装饰器 - 注入客户端 IP 地址
 */
export function Ip(): ParameterDecorator {
  return createParamDecorator('Ip');
}

/**
 * @HostParam() 装饰器 - 注入 Host 头部参数
 */
export function HostParam(name?: string): ParameterDecorator {
  return createParamDecorator('HostParam', { name });
}
