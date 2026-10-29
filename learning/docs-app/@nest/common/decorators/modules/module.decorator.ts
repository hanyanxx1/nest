import 'reflect-metadata';
import type { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface.js';

/**
 * 模块装饰器。定义一个 Nest 应用模块及其配置。
 *
 * 模块是应用的顶级组织单位。通过 @Module() 装饰器，
 * 可以配置：
 * - 该模块提供哪些服务（providers）
 * - 该模块导出哪些控制器（controllers）
 * - 该模块依赖哪些其他模块（imports）
 * - 该模块导出哪些 provider 给其他模块使用（exports）
 *
 * @param metadata - 模块配置元数据，包括 controllers、providers、imports、exports
 * @returns ClassDecorator - TypeScript 类装饰器函数
 *
 * 使用示例：
 *
 * 示例 1 - 基础模块配置：
 *   @Module({
 *     controllers: [AppController],
 *     providers: [AppService]
 *   })
 *   export class AppModule {}
 *
 *   这表示：
 *   - AppController 是控制器，会处理 HTTP 路由
 *   - AppService 是 provider，会被 AppController 注入
 *
 * 示例 2 - 多个控制器和 provider：
 *   @Module({
 *     controllers: [CatsController, DogsController],
 *     providers: [CatsService, DogsService, LoggingService]
 *   })
 *   export class PetsModule {}
 *
 * 示例 3 - 带导入的模块：
 *   @Module({
 *     imports: [DatabaseModule, AuthModule],
 *     controllers: [UserController],
 *     providers: [UserService]
 *   })
 *   export class UserModule {}
 *
 * 示例 4 - 导出 provider：
 *   @Module({
 *     providers: [AuthService],
 *     exports: [AuthService]  // 其他模块可以导入和使用 AuthService
 *   })
 *   export class AuthModule {}
 *
 * 工作原理：
 *
 * @Module() 装饰器工厂接收模块配置对象，
 * 将配置中的每一个键值对写成元数据，存储在模块类上。
 *
 * 第一阶段 - 装饰器工厂执行（当代码被加载时）：
 *   @Module({...}) 调用 Module({...})
 *   返回一个实际的类装饰器函数 (target) => { ... }
 *
 * 第二阶段 - 装饰器应用（当类定义被处理时）：
 *   返回的装饰器函数接收被装饰的类（target），做以下事情：
 *   1. 遍历传入的 metadata 对象中的所有键值对
 *   2. 对每一对键值，调用 Reflect.defineMetadata(key, value, target)
 *   3. 将配置写入模块类上
 *
 * 元数据存储位置及示例：
 *
 *   @Module({
 *     controllers: [AppController],
 *     providers: [AppService]
 *   })
 *   export class AppModule {}
 *
 *   执行后，AppModule 类上会存储：
 *   metadata: {
 *     'controllers': [AppController],      // 类数组
 *     'providers': [AppService]            // 类数组
 *   }
 *
 * 框架如何使用这些元数据：
 *
 * 当应用启动时（在 main.ts 中调用 NestFactory.create(AppModule)）：
 *
 * 1. 读取 controllers 元数据：
 *    - controllers = Reflect.getMetadata('controllers', AppModule)
 *    - 得到 [AppController]
 *    - 这些控制器会被实例化并注册路由
 *
 * 2. 读取 providers 元数据：
 *    - providers = Reflect.getMetadata('providers', AppModule)
 *    - 得到 [AppService]
 *    - 这些 provider 会被实例化并存入依赖注入容器
 *
 * 3. 实例化控制器并注入 provider：
 *    - new AppController(appService实例)
 *    - 控制器获得所需的依赖
 *
 * 4. 注册路由：
 *    - 扫描控制器中带 @Get/@Post 等的方法
 *    - 向 Express 应用注册路由
 *
 * 当前实现的限制：
 * 这个最小实现只处理 controllers 和 providers。
 * 真实的 Nest 框架还支持：
 * - imports: 导入其他模块
 * - exports: 导出 provider 给其他模块使用
 * - 全局模块（Global Modules）
 * - 动态模块（Dynamic Modules）
 *
 * 模块配置对象的形状：
 *
 * interface ModuleMetadata {
 *   imports?: any[];        // 导入其他模块
 *   controllers?: any[];    // 控制器类数组
 *   providers?: any[];      // provider 类数组
 *   exports?: any[];        // 导出给其他模块的 provider
 * }
 *
 * 调试技巧：
 *
 * 在 NestFactory.create() 中，可以读取模块元数据来验证配置：
 *   const controllerTypes = Reflect.getMetadata('controllers', moduleType)
 *   const providerTypes = Reflect.getMetadata('providers', moduleType)
 *
 * 观察实际的模块配置：
 *   @Module({
 *     controllers: [AppController, CatsController],
 *     providers: [AppService, CatsService]
 *   })
 *   export class AppModule {}
 *
 *   controllerTypes = [AppController, CatsController]
 *   providerTypes = [AppService, CatsService]
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function) => {
    // 遍历传入的配置对象中的所有键值对。
    // 例如 { controllers: [...], providers: [...] }
    for (const [key, value] of Object.entries(metadata)) {
      // 对每一对键值，调用 Reflect.defineMetadata 将其写到模块类上。
      // key 例如 'controllers'、'providers'
      // value 例如 [AppController] 或 [AppService]
      Reflect.defineMetadata(key, value, target);
    }
  };
}
