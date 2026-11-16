// 加载 Reflect 元数据读取能力；@Module()、@Controller()、@Get() 等装饰器会把信息写入元数据。
// 这是 TypeScript 装饰器的必要前置条件；不加载它，后续 Reflect.getMetadata() 会返回 undefined。
import 'reflect-metadata';
import express from 'express';
import { ExpressAdapter } from '../platform-express/adapters/express-adapter.js';
import { NestApplication } from './nest-application.js';
import { RouterExplorer } from './router/router-explorer.js';
import { RouterResponseController } from './router/router-response-controller.js';
import { Logger, type DynamicModule, type RouteConflictPolicy, type RouteResolutionStrategy } from '../common/index.js';
import { GLOBAL_MODULE_METADATA, OPTIONAL_DEPS_METADATA, PROPERTY_DEPS_METADATA } from '../common/constants.js';
import { RouteConflictException } from './errors/exceptions/route-conflict.exception.js';
import { RouteConflictDetector } from './router/route-conflict-detector.js';
import { RouteSpecificitySorter } from './router/route-specificity-sorter.js';

type ModuleReference = Function | DynamicModule;

// 每个模块保存自己的 Provider Map，以及显式和全局绑定得到的导入模块。
type ModuleContext = {
  moduleType: Function;
  importedModuleTypes: Function[];
  controllerTypes: Function[];
  providerTypes: Function[];
  exportTypes: Function[];
  providers: Map<Function, object>;
  moduleInstance: object | undefined;
};

export class NestFactory {
  // options.rawBody 为 true 时，保留原始请求体，供 @RawBody() 读取。
  static async create(
    moduleType: Function,
    options: {
      rawBody?: boolean;
      routeConflictPolicy?: RouteConflictPolicy;
      routeResolutionStrategy?: RouteResolutionStrategy;
    } = {},
  ): Promise<NestApplication> {
    // 对应官方在扫描应用模块前输出的启动日志。
    const factoryLogger = new Logger(NestFactory.name);
    factoryLogger.log('Starting Nest application...');

    const moduleContexts = collectModuleContexts(moduleType);

    // 先创建所有模块各自的 Provider，再分别处理模块内的属性注入。
    for (const context of moduleContexts) {
      for (const providerType of context.providerTypes) {
        context.providers.set(providerType, Reflect.construct(providerType, []));
      }
    }

    for (const context of moduleContexts) {
      for (const providerType of context.providerTypes) {
        const provider = context.providers.get(providerType);
        if (provider === undefined) {
          throw new Error(`${providerType.name} Provider 实例未能创建`);
        }

        applyPropertyDependencies(providerType, provider, context, moduleContexts);
      }
    }

    // Provider 实例和属性依赖都准备好后，再构造各个 Module。
    for (const context of moduleContexts) {
      const dependencies = readConstructorDependencies(context.moduleType);

      const argumentsForModule = dependencies.map((dependency) => {
        const instance = resolveProvider(context, dependency, moduleContexts);
        if (instance !== undefined) {
          return instance;
        }

        throw new Error(
          `${context.moduleType.name} 依赖的 ${dependency.name} 未在其 providers 或可见导入模块 exports 中注册`,
        );
      });

      context.moduleInstance = Reflect.construct(context.moduleType, argumentsForModule) as object;
    }

    const httpServer = express();
    httpServer.use(
      express.json({
        // verify 在解析前拿到原始字节；开启 rawBody 时存到 request.rawBody。
        verify: options.rawBody
          ? (request, _response, buffer) => {
              (request as { rawBody?: Buffer }).rawBody = buffer;
            }
          : undefined,
      }),
    );

    const adapter = new ExpressAdapter(httpServer);
    const responseController = new RouterResponseController(adapter);
    const routerExplorer = new RouterExplorer();
    // 冲突告警使用统一 Logger，并标记为应用上下文日志。
    const logger = new Logger(NestApplication.name);

    // 控制器实例化仍在 create() 里，路由注册推迟到 app.init()。
    const registerRoutes = (): void => {
      const controllers = moduleContexts.flatMap((context) =>
        context.controllerTypes.map((controllerType) => {
          const dependencies = readConstructorDependencies(controllerType);
          const optionalDependencyIndexes = readOptionalDependencies(controllerType);

          const argumentsForController = dependencies.map((dependency, index) => {
            const instance = resolveProvider(context, dependency, moduleContexts);
            if (instance !== undefined) {
              return instance;
            }

            // 只有标记为 Optional 的缺失依赖，才允许以 undefined 注入。
            if (optionalDependencyIndexes.includes(index)) {
              return undefined;
            }

            throw new Error(
              `${controllerType.name} 依赖的 ${dependency.name} 未在 ${context.moduleType.name} 的 providers 或直接导入模块 exports 中注册`,
            );
          });

          const controller = Reflect.construct(controllerType, argumentsForController) as object;
          applyPropertyDependencies(controllerType, controller, context, moduleContexts);

          return controller;
        }),
      );

      const discoveredRoutes = controllers.flatMap((controller) => routerExplorer.getRoutes(controller));

      // specificity 按路径具体程度排序；默认策略保留发现顺序。
      const routes =
        options.routeResolutionStrategy === 'specificity'
          ? RouteSpecificitySorter.sort(discoveredRoutes)
          : discoveredRoutes;

      const shadowConflicts = RouteConflictDetector.detectShadowConflicts(
        routes,
        options.routeResolutionStrategy === 'specificity' ? discoveredRoutes : undefined,
      );

      // warn 只记录冲突，不阻止路由注册和应用初始化。
      if (options.routeConflictPolicy?.duplicate === 'warn') {
        const warnings = RouteConflictDetector.detectDuplicateConflicts(routes);

        for (const warning of warnings) {
          logger.warn(warning);
        }
      }

      if (options.routeConflictPolicy?.shadow === 'warn') {
        for (const warning of shadowConflicts) {
          logger.warn(warning);
        }
      }

      // error 策略先收集全部冲突，再统一拒绝初始化。
      const conflicts: string[] = [];

      if (options.routeConflictPolicy?.duplicate === 'error') {
        conflicts.push(...RouteConflictDetector.detectDuplicateConflicts(routes));
      }

      if (options.routeConflictPolicy?.shadow === 'error') {
        conflicts.push(...shadowConflicts);
      }

      if (conflicts.length > 0) {
        throw new RouteConflictException(conflicts);
      }

      routerExplorer.registerRoutes(
        routes,
        {
          get: adapter.registerGet.bind(adapter),
          post: adapter.registerPost.bind(adapter),
          put: adapter.registerPut.bind(adapter),
          delete: adapter.registerDelete.bind(adapter),
          patch: adapter.registerPatch.bind(adapter),
          options: adapter.registerOptions.bind(adapter),
          head: adapter.registerHead.bind(adapter),
          query: adapter.registerQuery.bind(adapter),
          all: adapter.registerAll.bind(adapter),
        },
        responseController,
      );
    };

    return new NestApplication(httpServer, registerRoutes);
  }
}

function readClassMetadata(moduleType: Function, key: 'controllers' | 'providers' | 'exports'): Function[] {
  const value: unknown = Reflect.getMetadata(key, moduleType);
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value) && value.every((item): item is Function => typeof item === 'function')) {
    return value;
  }
  throw new Error(`${moduleType.name} 的 ${key} 元数据必须是类数组`);
}

function mergeClassMetadata(
  moduleType: Function,
  key: 'controllers' | 'providers' | 'exports',
  dynamicMetadata: DynamicModule | undefined,
): Function[] {
  const staticTypes = readClassMetadata(moduleType, key);
  const dynamicTypes = dynamicMetadata?.[key] ?? [];

  if (!Array.isArray(dynamicTypes) || !dynamicTypes.every((item): item is Function => typeof item === 'function')) {
    throw new Error(`${moduleType.name} 的动态 ${key} 元数据必须是类数组`);
  }

  return [...staticTypes, ...dynamicTypes];
}

function isDynamicModule(value: unknown): value is DynamicModule {
  return typeof value === 'object' && value !== null && 'module' in value && typeof value.module === 'function';
}

function getModuleType(moduleReference: ModuleReference): Function {
  return typeof moduleReference === 'function' ? moduleReference : moduleReference.module;
}

function readModuleImports(moduleType: Function): ModuleReference[] {
  const value: unknown = Reflect.getMetadata('imports', moduleType);
  if (value === undefined) {
    return [];
  }

  if (
    Array.isArray(value) &&
    value.every((item): item is ModuleReference => typeof item === 'function' || isDynamicModule(item))
  ) {
    return value;
  }

  throw new Error(`${moduleType.name} 的 imports 元数据必须是 Module 或 DynamicModule 数组`);
}

function collectModuleContexts(rootModuleType: Function): ModuleContext[] {
  const moduleContexts: ModuleContext[] = [];
  const visitedModuleTypes = new Set<Function>();

  const visit = (moduleReference: ModuleReference): void => {
    // 动态模块对象指向它实际代表的 Module 类。
    const dynamicMetadata = typeof moduleReference === 'function' ? undefined : moduleReference;
    const moduleType = getModuleType(moduleReference);

    if (visitedModuleTypes.has(moduleType)) {
      return;
    }
    visitedModuleTypes.add(moduleType);

    const importedModuleReferences = [...readModuleImports(moduleType)];
    const importedModuleTypes = importedModuleReferences.map(getModuleType);

    // // 合并 Module 类上的静态元数据与动态模块对象中的类元数据。
    moduleContexts.push({
      moduleType,
      importedModuleTypes,
      controllerTypes: mergeClassMetadata(moduleType, 'controllers', dynamicMetadata),
      providerTypes: mergeClassMetadata(moduleType, 'providers', dynamicMetadata),
      exportTypes: mergeClassMetadata(moduleType, 'exports', dynamicMetadata),
      providers: new Map<Function, object>(),
      moduleInstance: undefined,
    });

    for (const importedModuleReference of importedModuleReferences) {
      visit(importedModuleReference);
    }
  };

  visit(rootModuleType);

  // 先收集完显式 imports，才能知道本应用中有哪些全局模块。
  const globalModuleTypes = moduleContexts
    .filter((context) => Reflect.getMetadata(GLOBAL_MODULE_METADATA, context.moduleType) === true)
    .map((context) => context.moduleType);

  for (const context of moduleContexts) {
    for (const globalModuleType of globalModuleTypes) {
      // 全局模块不把自己加入自己的 imports；已有的显式导入也不重复添加。
      if (context.moduleType === globalModuleType || context.importedModuleTypes.includes(globalModuleType)) {
        continue;
      }

      context.importedModuleTypes.push(globalModuleType);
    }
  }

  return moduleContexts;
}

function resolveProvider(
  context: ModuleContext,
  providerType: Function,
  moduleContexts: ModuleContext[],
): object | undefined {
  // 先查当前模块自己的 Provider。
  const localProvider = context.providers.get(providerType);
  if (localProvider !== undefined) {
    return localProvider;
  }

  // 本地没有时，只沿当前模块直接导入的模块查找。
  const importedModuleTypes = context.importedModuleTypes;

  for (const importedModuleType of importedModuleTypes) {
    const importedContext = moduleContexts.find((candidate) => candidate.moduleType === importedModuleType);

    if (importedContext === undefined) {
      throw new Error(`${context.moduleType.name} 导入的模块上下文未能收集`);
    }

    const exportedProvider = findExportedProvider(importedContext, providerType, moduleContexts);
    if (exportedProvider !== undefined) {
      return exportedProvider;
    }
  }

  return undefined;
}

function findExportedProvider(
  moduleContext: ModuleContext,
  providerType: Function,
  moduleContexts: ModuleContext[],
  visitedModuleTypes: Set<Function> = new Set<Function>(),
): object | undefined {
  // 防止再导出关系形成循环。
  if (visitedModuleTypes.has(moduleContext.moduleType)) {
    return undefined;
  }
  visitedModuleTypes.add(moduleContext.moduleType);

  // 当前模块直接导出目标 Provider 时，返回它已有的实例。
  if (moduleContext.exportTypes.includes(providerType)) {
    const exportedProvider = moduleContext.providers.get(providerType);
    if (exportedProvider === undefined) {
      throw new Error(`${moduleContext.moduleType.name} 导出了 ${providerType.name}，但没有对应的 Provider 实例`);
    }

    return exportedProvider;
  }

  // 只允许沿当前模块明确再导出的 imported module 继续查找。
  const importedModuleTypes = moduleContext.importedModuleTypes;

  for (const importedModuleType of importedModuleTypes) {
    if (!moduleContext.exportTypes.includes(importedModuleType)) {
      continue;
    }

    const importedContext = moduleContexts.find((candidate) => candidate.moduleType === importedModuleType);
    if (importedContext === undefined) {
      throw new Error(`${moduleContext.moduleType.name} 再导出的模块上下文未能收集`);
    }

    const exportedProvider = findExportedProvider(importedContext, providerType, moduleContexts, visitedModuleTypes);
    if (exportedProvider !== undefined) {
      return exportedProvider;
    }
  }

  return undefined;
}

function readConstructorDependencies(controllerType: Function): Function[] {
  const value: unknown = Reflect.getMetadata('design:paramtypes', controllerType);
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value) && value.every((item): item is Function => typeof item === 'function')) {
    return value;
  }
  throw new Error(`${controllerType.name} 的构造函数依赖元数据无效`);
}

function readOptionalDependencies(controllerType: Function): number[] {
  const value: unknown = Reflect.getMetadata(OPTIONAL_DEPS_METADATA, controllerType);

  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value) && value.every((item): item is number => Number.isInteger(item) && item >= 0)) {
    return value;
  }

  throw new Error(`${controllerType.name} 的可选依赖元数据无效`);
}

type PropertyDependency = {
  key: string | symbol;
  type: Function;
};

function readPropertyDependencies(controllerType: Function): PropertyDependency[] {
  const value: unknown = Reflect.getMetadata(PROPERTY_DEPS_METADATA, controllerType);

  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value) && value.every(isPropertyDependency)) {
    return value;
  }

  throw new Error(`${controllerType.name} 的属性依赖元数据无效`);
}

function isPropertyDependency(value: unknown): value is PropertyDependency {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'key' in value &&
    (typeof value.key === 'string' || typeof value.key === 'symbol') &&
    'type' in value &&
    typeof value.type === 'function'
  );
}

function applyPropertyDependencies(
  instanceType: Function,
  instance: object,
  context: ModuleContext,
  moduleContexts: ModuleContext[],
): void {
  for (const { key, type } of readPropertyDependencies(instanceType)) {
    const dependency = resolveProvider(context, type, moduleContexts);
    if (dependency === undefined) {
      throw new Error(
        `${instanceType.name} 属性依赖的 ${type.name} 未在 ${context.moduleType.name} 的 providers 或直接导入模块 exports 中注册`,
      );
    }

    // 把查找到的 Provider 实例赋给标记了 @Inject() 的属性。
    Object.assign(instance, { [key]: dependency });
  }
}
