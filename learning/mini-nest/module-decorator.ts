import { createServer } from 'node:http';

type ModuleMetadata = {
  providers: Function[];
  controllers: Function[];
  imports: Function[];
};

type ModuleScanResult = {
  module: Function;
  providers: Function[];
  controllers: Function[];
  imports: Function[];
};

const moduleMetadata = new WeakMap<Function, ModuleMetadata>();

function Module(metadata: ModuleMetadata) {
  return (target: Function) => {
    moduleMetadata.set(target, metadata);
  };
}

function scanModule(moduleType: Function): ModuleScanResult {
  const metadata = moduleMetadata.get(moduleType);

  if (!metadata) {
    throw new Error(`No module metadata found for ${moduleType.name}`);
  }

  return {
    module: moduleType,
    providers: metadata.providers,
    controllers: metadata.controllers,
    imports: metadata.imports,
  };
}

function scanModules(
  moduleType: Function,
  visited = new Set<Function>(),
): ModuleScanResult[] {
  if (visited.has(moduleType)) {
    return [];
  }

  visited.add(moduleType);

  const result = scanModule(moduleType);

  return [
    result,
    ...result.imports.flatMap(importedModule =>
      scanModules(importedModule, visited),
    ),
  ];
}

function createProviderInstances(results: ModuleScanResult[]) {
  const registeredProviders = new Set<Function>();

  for (const result of results) {
    for (const provider of result.providers) {
      registeredProviders.add(provider);
    }
  }

  const instances = new Map<Function, object>();

  function createInstance(provider: Function): object {
    const existingInstance = instances.get(provider);

    if (existingInstance !== undefined) {
      return existingInstance;
    }

    if (!registeredProviders.has(provider)) {
      throw new Error(`No provider registered for ${provider.name}`);
    }

    const dependencies = constructorDependencies.get(provider) ?? [];
    const injectedDependencies = dependencies.map(createInstance);
    const instance = Reflect.construct(provider, injectedDependencies);

    instances.set(provider, instance);
    return instance;
  }

  for (const provider of registeredProviders) {
    createInstance(provider);
  }

  return instances;
}

class CommonModule {}
Module({
  imports: [CommonModule],
  providers: [],
  controllers: [],
})(CommonModule);

class SharedService {
  getMessage() {
    return 'Hello from SharedService';
  }
}
class SharedModule {}
Module({
  imports: [CommonModule],
  providers: [SharedService],
  controllers: [],
})(SharedModule);

class AppService {
  private readonly sharedService: SharedService;

  constructor(sharedService: SharedService) {
    this.sharedService = sharedService;
  }

  getMessage() {
    return `${this.sharedService.getMessage()} -> Hello from AppService`;
  }
}

class AppController {
  private readonly appService: AppService;

  constructor(appService: AppService) {
    this.appService = appService;
  }
  getMessage() {
    return this.appService.getMessage();
  }
}

type RouteDefinition = {
  method: 'GET';
  path: string;
  propertyKey: string;
};

const routeMetadata = new WeakMap<Function, RouteDefinition[]>();

function Get(path: string) {
  return (target: { constructor: Function }, propertyKey: string) => {
    const controllerType = target.constructor;
    const routes = routeMetadata.get(controllerType) ?? [];

    routes.push({
      method: 'GET',
      path,
      propertyKey,
    });

    routeMetadata.set(controllerType, routes);
  };
}

Get('/hello')(AppController.prototype, 'getMessage');

const constructorDependencies = new Map<Function, Function[]>([
  [AppService, [SharedService]],
  [AppController, [AppService]],
]);

function createControllerInstances(
  results: ModuleScanResult[],
  providerInstances: Map<Function, object>,
) {
  const instances = new Map<Function, object>();

  for (const result of results) {
    for (const controller of result.controllers) {
      const dependencies = constructorDependencies.get(controller) ?? [];

      const injectedDependencies = dependencies.map(dependency => {
        const instance = providerInstances.get(dependency);

        if (instance === undefined) {
          throw new Error(`No provider instance found for ${dependency.name}`);
        }

        return instance;
      });

      instances.set(
        controller,
        Reflect.construct(controller, injectedDependencies),
      );
    }
  }

  return instances;
}

function resolveRoutes(
  results: ModuleScanResult[],
  controllerInstances: Map<Function, object>,
) {
  const routes: Array<RouteDefinition & { handler: Function }> = [];

  for (const result of results) {
    for (const controller of result.controllers) {
      const controllerInstance = controllerInstances.get(controller);

      if (controllerInstance === undefined) {
        throw new Error(`No controller instance found for ${controller.name}`);
      }

      const definitions = routeMetadata.get(controller) ?? [];

      for (const route of definitions) {
        const method = Reflect.get(controllerInstance, route.propertyKey);

        if (typeof method !== 'function') {
          throw new Error(
            `Route handler ${controller.name}.${route.propertyKey} is not a function`,
          );
        }

        routes.push({
          ...route,
          handler: method.bind(controllerInstance),
        });
      }
    }
  }

  return routes;
}

class AppModule {}
Module({
  providers: [AppService],
  controllers: [AppController],
  imports: [SharedModule, CommonModule],
})(AppModule);

const results = scanModules(AppModule);

const providerInstances = createProviderInstances(results);
// console.log('providerInstances', providerInstances);

const controllerInstances = createControllerInstances(
  results,
  providerInstances,
);

const routes = resolveRoutes(results, controllerInstances);

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;

  const route = routes.find(
    item => item.method === request.method && item.path === pathname,
  );

  if (route === undefined) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }

  const result = route.handler();

  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(String(result));
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Mini Nest listening on http://127.0.0.1:3000');
});
