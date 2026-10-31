import 'reflect-metadata';
import {
  CONTROLLER_WATERMARK,
  PATH_METADATA,
  HOST_METADATA,
} from '../../constants.js';

/**
 * 控制器装饰器。
 *
 * 标记一个类为 Nest 控制器，并为其设置路由前缀。
 * 被装饰的类的所有方法如果使用了 @Get、@Post 等路由装饰器，
 * 其最终路径将是：控制器前缀 + 方法路径。
 *
 * @param prefix - 控制器的路由前缀，可以是单一路径或路径数组。
 *                 默认值为 '/'，表示根路径前缀。
 *
 * @returns ClassDecorator - TypeScript 类装饰器函数
 *
 */
export function Controller(
  prefix: string | string[] | ControllerOptions = '/',
): ClassDecorator {
  const options =
    typeof prefix === 'string' || Array.isArray(prefix)
      ? { path: prefix }
      : prefix;

  return (target: Function) => {
    // 在类上写入控制器标记。
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);

    // 在类上写入路由前缀。
    Reflect.defineMetadata(PATH_METADATA, options.path ?? '/', target);

    if (options.host !== undefined) {
      Reflect.defineMetadata(HOST_METADATA, options.host, target);
    }
  };
}

interface ControllerOptions {
  path?: string | string[];
  host?: string;
}
