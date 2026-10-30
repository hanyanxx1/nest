import 'reflect-metadata';
import { PARAM_DECORATORS_METADATA } from '../../constants.js';

/**
 * @Res() 装饰器 - 参数装饰器
 *
 * 用途：让 Nest 注入 Express 的 Response 对象到方法参数中。
 * 这样开发者可以直接操纵 HTTP 响应（设置状态码、响应头、发送数据等）。
 *
 * 两种用法：
 *
 * 用法 1：直接返回数据（Nest自动处理序列化 + 状态码）
 * -------------------------------------------------------
 * @Get()
 * @Res()
 * findAll(@Res() response: Response): void {
 *   response.status(200).json([{ name: 'Cat 1' }]);
 * }
 * // 此时方法返回 void，Nest 不会再处理返回值
 * // 责任完全交给开发者管理响应
 *
 *
 * 用法 2：带 passthrough: true（既注入 Response，也处理返回值）
 * -------------------------------------------------------
 * @Get()
 * @Res({ passthrough: true })
 * findAll(@Res() response: Response) {
 *   response.status(202);  // 设置状态码
 *   return [{ name: 'Cat 1' }];  // 返回数据，Nest 会序列化发送
 * }
 * // passthrough: true 让 Nest 同时处理：
 * //   1. @Res() 注入 Express response 对象
 * //   2. 方法返回值被 Nest 序列化并发送
 *
 *
 * 工作原理：
 *
 * 编译时（装饰器工厂执行）：
 *   @Res() 或 @Res({ passthrough: true })
 *   调用 Res() 或 Res({passthrough: true})
 *   返回参数装饰器函数
 *
 * 运行时（参数装饰器应用）：
 *   参数装饰器函数被调用时接收：
 *   - target: 控制器类的原型（CatsController.prototype）
 *   - propertyKey: 方法名（'findAll'）
 *   - parameterIndex: 参数位置（0 表示第一个参数）
 *
 *   装饰器在方法上写入元数据：
 *   Reflect.defineMetadata(
 *     PARAM_DECORATORS_METADATA,
 *     { 0: { decorator: 'Res', options: { passthrough: true } } },
 *     target.propertyKey  // 方法函数对象
 *   )
 *
 *   后续当 RouterExplorer 扫描方法时：
 *   1. 读取方法上的 PARAM_DECORATORS_METADATA
 *   2. 找到参数位置 0 对应的装饰器信息
 *   3. 在执行方法时，注入 Express response 对象到该位置
 *
 *
 * @param options - 配置选项
 *   - passthrough?: boolean - 是否允许方法返回值被处理
 *     默认 false：方法返回值被忽略，完全由 @Res() 管理响应
 *     为 true：既注入 Response 对象，也处理方法的返回值
 *
 * @returns ParameterDecorator - 参数装饰器函数
 *
 * 示例运行流程：
 *
 * 代码：
 *   class CatsController {
 *     @Get('list')
 *     @Res({ passthrough: true })
 *     findAll(@Res() response: Response) {
 *       response.status(202);
 *       return [];
 *     }
 *   }
 *
 * 装饰器应用顺序：
 *   1. @Res() 作用在参数 0 上
 *      - 写入 PARAM_DECORATORS_METADATA
 *   2. @Res({ passthrough: true }) 方法装饰器执行
 *      - 写入方法级别的元数据
 *   3. @Get('list') 方法装饰器执行
 *      - 写入路由信息
 *
 * 执行时（当 GET /cats/list 请求到达）：
 *   1. RouterExplorer 查找匹配的方法 findAll
 *   2. 读取 PARAM_DECORATORS_METADATA，发现参数 0 需要 Response 对象
 *   3. 调用方法时：findAll(expressResponseObject)
 *   4. 方法执行，设置 status 202
 *   5. 方法返回 []
 *   6. 因为 passthrough: true，Nest 继续处理返回值
 *   7. 最终发送：HTTP 202 + JSON 序列化的 []
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
 *
 * 使用示例：
 *   @Get('data')
 *   getData(@Res() response: Response): void {
 *     response.status(200).json({ data: 'hello' });
 *   }
 *   // 请求 GET /data 时，获得 200 + { data: 'hello' }
 *
 * @param options - 配置选项，如 { passthrough: true }
 * @returns ParameterDecorator
 */
export function Res(options?: ResDecoratorOptions): ParameterDecorator {
  return createParamDecorator('Res', options);
}

/**
 * @Req() 装饰器 - 注入 Express Request 对象
 *
 * 使用示例：
 *   @Get()
 *   getData(@Req() request: Request): any {
 *     console.log(request.url);
 *     return {};
 *   }
 *   // 方法接收完整的 Express Request 对象
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
