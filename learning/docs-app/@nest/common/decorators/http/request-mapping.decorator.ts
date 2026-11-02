import { METHOD_METADATA, PATH_METADATA } from '../../constants.js';
import { RequestMethod } from '../../enums/request-method.enum.js';

export interface RequestMappingMetadata {
  path?: string | string[];
  method?: RequestMethod;
}

const defaultMetadata = {
  [PATH_METADATA]: '/',
  [METHOD_METADATA]: RequestMethod.GET,
};

export const RequestMapping = (metadata: RequestMappingMetadata = defaultMetadata): MethodDecorator => {
  const pathMetadata = metadata[PATH_METADATA];
  const path = pathMetadata && pathMetadata.length ? pathMetadata : '/';
  const requestMethod = metadata[METHOD_METADATA] || RequestMethod.GET;

  return (target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, requestMethod, descriptor.value);
    return descriptor;
  };
};

const createMappingDecorator =
  (method: RequestMethod) =>
  (path?: string | string[]): MethodDecorator => {
    return RequestMapping({
      [PATH_METADATA]: path,
      [METHOD_METADATA]: method,
    });
  };

export const Get = createMappingDecorator(RequestMethod.GET);

export const Post = createMappingDecorator(RequestMethod.POST);
export const Delete = createMappingDecorator(RequestMethod.DELETE);
export const Put = createMappingDecorator(RequestMethod.PUT);
export const Patch = createMappingDecorator(RequestMethod.PATCH);
export const Options = createMappingDecorator(RequestMethod.OPTIONS);
export const Head = createMappingDecorator(RequestMethod.HEAD);
export const All = createMappingDecorator(RequestMethod.ALL);
export const Search = createMappingDecorator(RequestMethod.SEARCH);
export const QueryMethod = createMappingDecorator(RequestMethod.QUERY);
export const Propfind = createMappingDecorator(RequestMethod.PROPFIND);
export const Proppatch = createMappingDecorator(RequestMethod.PROPPATCH);
export const Mkcol = createMappingDecorator(RequestMethod.MKCOL);
export const Copy = createMappingDecorator(RequestMethod.COPY);
export const Move = createMappingDecorator(RequestMethod.MOVE);
export const Lock = createMappingDecorator(RequestMethod.LOCK);
export const Unlock = createMappingDecorator(RequestMethod.UNLOCK);
