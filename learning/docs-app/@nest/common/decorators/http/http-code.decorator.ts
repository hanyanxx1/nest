import { HTTP_CODE_METADATA } from '../../constants.js';

export const HttpCode = (statusCode: number): MethodDecorator => {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    Reflect.defineMetadata(HTTP_CODE_METADATA, statusCode, descriptor.value);
    return descriptor;
  };
};
