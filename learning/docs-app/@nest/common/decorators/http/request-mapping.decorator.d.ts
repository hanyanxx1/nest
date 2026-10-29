import { RequestMethod } from '../../enums/request-method.enum.js';
export interface RequestMappingMetadata {
  path?: string | string[];
  method?: RequestMethod;
}
export declare const RequestMapping: (
  metadata?: RequestMappingMetadata,
) => MethodDecorator;
export declare const Get: (path?: string | string[]) => MethodDecorator;
export declare const Post: (path?: string | string[]) => MethodDecorator;
export declare const Delete: (path?: string | string[]) => MethodDecorator;
export declare const Put: (path?: string | string[]) => MethodDecorator;
export declare const Patch: (path?: string | string[]) => MethodDecorator;
export declare const Options: (path?: string | string[]) => MethodDecorator;
export declare const Head: (path?: string | string[]) => MethodDecorator;
export declare const All: (path?: string | string[]) => MethodDecorator;
export declare const Search: (path?: string | string[]) => MethodDecorator;
export declare const QueryMethod: (path?: string | string[]) => MethodDecorator;
export declare const Propfind: (path?: string | string[]) => MethodDecorator;
export declare const Proppatch: (path?: string | string[]) => MethodDecorator;
export declare const Mkcol: (path?: string | string[]) => MethodDecorator;
export declare const Copy: (path?: string | string[]) => MethodDecorator;
export declare const Move: (path?: string | string[]) => MethodDecorator;
export declare const Lock: (path?: string | string[]) => MethodDecorator;
export declare const Unlock: (path?: string | string[]) => MethodDecorator;
