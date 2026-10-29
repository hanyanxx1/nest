import 'reflect-metadata';
import { RequestMethod } from '../../common/enums/request-method.enum.js';
import { RouterResponseController } from './router-response-controller.js';
interface RouteDefinition {
  methodName: string;
  method: RequestMethod;
  path: string | string[];
  callback: Function;
}
interface DiscoveredRoute {
  methodName: string;
  method: RequestMethod;
  path: string;
  callback: Function;
}
export declare class RouterExplorer {
  explore(controller: object): string[];
  scanMethods(controller: object): RouteDefinition[];
  getRoutes(controller: object): DiscoveredRoute[];
  registerRoutes(
    controller: object,
    registerGet: (path: string, handler: Function) => unknown,
    responseController: RouterResponseController,
  ): void;
}
export {};
