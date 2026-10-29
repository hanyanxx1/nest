import 'reflect-metadata';
import express from 'express';
import { ExpressAdapter } from '../platform-express/adapters/express-adapter.js';
import { NestApplication } from './nest-application.js';
import { RouterExplorer } from './router/router-explorer.js';
import { RouterResponseController } from './router/router-response-controller.js';
export class NestFactory {
    static async create(moduleType) {
        const controllerTypes = readClassMetadata(moduleType, 'controllers');
        const providerTypes = readClassMetadata(moduleType, 'providers');
        const providers = new Map();
        for (const providerType of providerTypes) {
            providers.set(providerType, Reflect.construct(providerType, []));
        }
        const httpServer = express();
        const adapter = new ExpressAdapter(httpServer);
        const responseController = new RouterResponseController(adapter);
        const routerExplorer = new RouterExplorer();
        for (const controllerType of controllerTypes) {
            const dependencies = readConstructorDependencies(controllerType);
            const argumentsForController = dependencies.map((dependency) => {
                const instance = providers.get(dependency);
                if (!instance) {
                    throw new Error(`${controllerType.name} 依赖的 ${dependency.name} 未在 providers 中注册`);
                }
                return instance;
            });
            const controller = Reflect.construct(controllerType, argumentsForController);
            routerExplorer.registerRoutes(controller, adapter.registerGet.bind(adapter), responseController);
        }
        return new NestApplication(httpServer);
    }
}
function readClassMetadata(moduleType, key) {
    const value = Reflect.getMetadata(key, moduleType);
    if (value === undefined) {
        return [];
    }
    if (Array.isArray(value) &&
        value.every((item) => typeof item === 'function')) {
        return value;
    }
    throw new Error(`${moduleType.name} 的 ${key} 元数据必须是类数组`);
}
function readConstructorDependencies(controllerType) {
    const value = Reflect.getMetadata('design:paramtypes', controllerType);
    if (value === undefined) {
        return [];
    }
    if (Array.isArray(value) &&
        value.every((item) => typeof item === 'function')) {
        return value;
    }
    throw new Error(`${controllerType.name} 的构造函数依赖元数据无效`);
}
//# sourceMappingURL=nest-factory.js.map