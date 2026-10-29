import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA } from '../../constants.js';

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
 * 使用示例：
 *
 * 示例 1 - 单一前缀（字符串）：
 *   @Controller('cats')
 *   export class CatsController {
 *     @Get('list')
 *     getList() { return [...]; }
 *     // 最终路由：GET /cats/list
 *   }
 *
 * 示例 2 - 无参，使用默认前缀：
 *   @Controller()
 *   export class AppController {
 *     @Get('health')
 *     getHealth() { return {ok: true}; }
 *     // 最终路由：GET /health
 *   }
 *
 * 示例 3 - 多个前缀（字符串数组）：
 *   @Controller(['api', 'v1'])
 *   export class ApiController {
 *     @Get('users')
 *     getUsers() { return [...]; }
 *     // 会为每个前缀生成路由：
 *     // GET /api/users
 *     // GET /v1/users
 *   }
 *
 * 示例 4 - 嵌套路径前缀：
 *   @Controller('api/v1/cats')
 *   export class CatsController {
 *     @Get('details')
 *     getDetails() { return {...}; }
 *     // 最终路由：GET /api/v1/cats/details
 *   }
 *
 * 工作原理：
 *
 * @Controller() 装饰器是一个工厂函数，分两阶段执行：
 *
 * 第一阶段 - 工厂执行（当代码被 TypeScript 编译和加载时）：
 *   @Controller('cats') 调用 Controller('cats')
 *   返回一个实际的类装饰器函数 (target) => { ... }
 *
 * 第二阶段 - 装饰器应用（当类定义被处理时）：
 *   返回的装饰器函数接收被装饰的类（target），做以下两件事：
 *   1. 在类上写入 CONTROLLER_WATERMARK = true
 *      - 这个标记说明这是一个有效的控制器类
 *      - NestFactory 会根据这个标记判断是否处理该类
 *
 *   2. 在类上写入 PATH_METADATA = prefix（传入的前缀）
 *      - 存储控制器的路由前缀
 *      - RouterExplorer 会读取这个值来获取前缀
 *
 * 元数据存储位置：
 *   Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target)
 *   // 在 CatsController 类上写入：
 *   // metadata: { 'nestjs:controller': true }
 *
 *   Reflect.defineMetadata(PATH_METADATA, prefix, target)
 *   // 在同一个 CatsController 类上写入：
 *   // metadata: { 'nestjs:path': 'cats' }
 *
 * 后续使用：
 *   当 NestFactory 启动时：
 *   1. 读取 @Module() 的 controllers 数组，得到 [CatsController, ...]
 *   2. 对每个控制器类调用 RouterExplorer.explore(controller实例)
 *   3. explore() 会检查 CONTROLLER_WATERMARK 是否为 true
 *   4. 如果是，读取 PATH_METADATA 获取前缀
 *   5. 然后扫描类的所有方法，查找路由装饰器
 *   6. 组合前缀和方法路径，生成最终路由
 *
 * 与其他装饰器的关系：
 *   @Controller() 是类装饰器
 *   @Get()/@Post() 等是方法装饰器
 *   执行顺序：方法装饰器先执行（从下往上），类装饰器最后执行
 *   因此在 @Controller() 执行时，所有 @Get() 的元数据已经写入方法了
 */
export function Controller(prefix: string | string[] = '/'): ClassDecorator {
  return (target: Function) => {
    // 在类上写入控制器标记。
    // CONTROLLER_WATERMARK = 'nestjs:controller'
    // 这个标记让 RouterExplorer.explore() 能够识别有效的控制器类。
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);

    // 在类上写入路由前缀。
    // PATH_METADATA = 'nestjs:path'
    // 例如 @Controller('cats') 会在这里存储 'cats'
    // 例如 @Controller(['cats', 'felines']) 会在这里存储数组 ['cats', 'felines']
    // 例如 @Controller() 会在这里存储默认值 '/'
    Reflect.defineMetadata(PATH_METADATA, prefix, target);
  };
}
