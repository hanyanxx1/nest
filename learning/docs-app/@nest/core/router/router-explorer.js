import 'reflect-metadata';
import { CONTROLLER_WATERMARK, METHOD_METADATA, PATH_METADATA, PARAM_DECORATORS_METADATA, } from '../../common/constants.js';
import { RequestMethod } from '../../common/enums/request-method.enum.js';
export class RouterExplorer {
    explore(controller) {
        const controllerType = controller.constructor;
        const isController = Reflect.getMetadata(CONTROLLER_WATERMARK, controllerType);
        if (!isController) {
            throw new Error(`${controllerType.name} 缺少 @Controller() 装饰器`);
        }
        const controllerPath = Reflect.getMetadata(PATH_METADATA, controllerType);
        if (typeof controllerPath === 'string') {
            return [controllerPath];
        }
        if (Array.isArray(controllerPath) &&
            controllerPath.every((path) => typeof path === 'string')) {
            return controllerPath;
        }
        throw new Error(`${controllerType.name} 的控制器路径必须是字符串或字符串数组`);
    }
    scanMethods(controller) {
        const prototype = Object.getPrototypeOf(controller);
        const routes = [];
        for (const methodName of Object.getOwnPropertyNames(prototype)) {
            if (methodName === 'constructor') {
                continue;
            }
            const callback = Reflect.get(prototype, methodName);
            if (typeof callback !== 'function') {
                continue;
            }
            const methodValue = Reflect.getMetadata(METHOD_METADATA, callback);
            if (methodValue === undefined) {
                continue;
            }
            if (!isRequestMethod(methodValue)) {
                throw new Error(`${methodName} 的 HTTP 方法元数据无效`);
            }
            const pathValue = Reflect.getMetadata(PATH_METADATA, callback);
            let path;
            if (typeof pathValue === 'string') {
                path = pathValue;
            }
            else if (Array.isArray(pathValue) &&
                pathValue.every((item) => typeof item === 'string')) {
                path = pathValue;
            }
            else {
                throw new Error(`${methodName} 的路由路径元数据无效`);
            }
            routes.push({
                methodName,
                method: methodValue,
                path,
                callback,
            });
        }
        return routes;
    }
    getRoutes(controller) {
        const controllerPaths = this.explore(controller);
        const methodDefinitions = this.scanMethods(controller);
        const routes = [];
        for (const controllerPath of controllerPaths) {
            for (const definition of methodDefinitions) {
                const methodPaths = Array.isArray(definition.path)
                    ? definition.path
                    : [definition.path];
                for (const methodPath of methodPaths) {
                    const segments = [controllerPath, methodPath]
                        .map((path) => path.replace(/^\/+|\/+$/g, ''))
                        .filter(Boolean);
                    const path = segments.length === 0 ? '/' : `/${segments.join('/')}`;
                    routes.push({
                        methodName: definition.methodName,
                        method: definition.method,
                        path,
                        callback: definition.callback,
                    });
                }
            }
        }
        return routes;
    }
    registerRoutes(controller, registerGet, responseController) {
        const routes = this.getRoutes(controller);
        for (const route of routes) {
            if (route.method !== RequestMethod.GET) {
                throw new Error(`当前路由注册器暂不支持 HTTP 方法：${route.method}`);
            }
            registerGet(route.path, async (request, response) => {
                const paramDecorators = Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, route.callback) || {};
                const args = [];
                for (const paramIndex in paramDecorators) {
                    const paramInfo = paramDecorators[paramIndex];
                    if (paramInfo.decorator === 'Res') {
                        args[paramIndex] = response;
                    }
                    else if (paramInfo.decorator === 'Req') {
                        args[paramIndex] = request;
                    }
                }
                const result = await route.callback.call(controller, ...args);
                return responseController.apply(result, response, undefined, route.callback);
            });
        }
    }
}
function isRequestMethod(value) {
    return (typeof value === 'number' &&
        Object.values(RequestMethod).some((method) => typeof method === 'number' && method === value));
}
//# sourceMappingURL=router-explorer.js.map