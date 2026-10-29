// 加载 Reflect 元数据能力，供装饰器把标记写在被装饰的类上。
import 'reflect-metadata';
import { INJECTABLE_WATERMARK } from '../../constants.js';

/**
 * 可注入装饰器。标记一个类为可注入的 provider。
 *
 * 被装饰的类可以被 Nest 框架的依赖注入系统识别和管理。
 * 当一个控制器或其他服务依赖这个被装饰的类时，
 * 框架会自动创建实例并注入。
 *
 * @returns ClassDecorator - TypeScript 类装饰器函数
 *
 * 使用示例：
 *
 * 示例 1 - 基础 Service：
 *   @Injectable()
 *   export class CatsService {
 *     getCats() { return [{name: 'Mimi'}]; }
 *   }
 *
 *   使用时，在 @Module() 的 providers 数组中注册：
 *   @Module({
 *     providers: [CatsService]
 *   })
 *
 * 示例 2 - Service 被 Controller 注入：
 *   @Injectable()
 *   export class CatsService {
 *     getCats() { return [{name: 'Mimi'}]; }
 *   }
 *
 *   @Controller('cats')
 *   export class CatsController {
 *     constructor(private catsService: CatsService) {}
 *     // 框架会自动注入 CatsService 实例
 *
 *     @Get()
 *     getCats() {
 *       return this.catsService.getCats();
 *     }
 *   }
 *
 * 示例 3 - Service 依赖另一个 Service：
 *   @Injectable()
 *   export class DatabaseService {
 *     query() { return [...]; }
 *   }
 *
 *   @Injectable()
 *   export class CatsService {
 *     constructor(private db: DatabaseService) {}
 *     // 框架会自动注入 DatabaseService 实例
 *   }
 *
 * 工作原理：
 *
 * @Injectable() 装饰器在被装饰的类上写入一个标记，表示：
 * "这个类已准备好被依赖注入系统管理"
 *
 * 第一阶段 - 装饰器工厂执行（当代码被加载时）：
 *   @Injectable() 调用 Injectable()
 *   返回一个实际的类装饰器函数 (target) => { ... }
 *
 * 第二阶段 - 装饰器应用（当类定义被处理时）：
 *   返回的装饰器函数接收被装饰的类（target），做一件事：
 *   在类上写入 INJECTABLE_WATERMARK = true
 *   - INJECTABLE_WATERMARK = 'nestjs:injectable'
 *   - 标记这个类是一个 provider
 *   - 稍后框架检查这个标记，决定是否将类实例化
 *
 * 元数据存储位置：
 *   Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target)
 *   // 在 CatsService 类上写入：
 *   // metadata: { 'nestjs:injectable': true }
 *
 * 框架如何使用这个标记：
 *
 * 1. 模块定义阶段：
 *    @Module({
 *      providers: [CatsService]  // CatsService 在这里注册
 *    })
 *
 * 2. 应用启动阶段（NestFactory.create()）：
 *    - 读取 @Module() 元数据，得到 providers = [CatsService]
 *    - 对每个 provider 类调用 Reflect.construct(CatsService, [])
 *    - 创建实例并存入 Map<CatsService, instance>
 *
 * 3. 控制器依赖注入阶段：
 *    - 读取 CatsController 的构造函数参数类型：[CatsService]
 *    - 从 Map 中查找 CatsService 的实例
 *    - 调用 new CatsController(catsService实例)
 *
 * 注意：
 * 当前的最小实现中，@Injectable() 装饰器仅提供标记作用。
 * 真实的 Nest 框架会通过这个标记来支持更多功能：
 * - Scope 控制（Singleton、Request、Transient）
 * - 工厂函数创建
 * - 提供者别名
 * - 动态模块
 * 等等。
 *
 * 与 @Controller 的区别：
 *   @Injectable() - 标记可注入的依赖（通常是 Service）
 *   @Controller() - 标记控制器类，并设置路由前缀
 *   @Injectable() 是通用的依赖标记，可用于任何 Service
 *   @Controller() 专用于路由控制器
 */
export function Injectable(): ClassDecorator {
  return (target: Function) => {
    // 在类上写入可注入标记。
    // INJECTABLE_WATERMARK = 'nestjs:injectable'
    // 这个标记让依赖注入系统能够识别这个类为可管理的 provider。
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
  };
}
