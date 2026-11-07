import { REDIRECT_METADATA } from '../../constants.js';

export const Redirect = (url = '', statusCode?: number): MethodDecorator => {
  return (_target: object, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    // 先把跳转配置记在处理方法上，供后续路由执行阶段读取。
    Reflect.defineMetadata(REDIRECT_METADATA, { url, statusCode }, descriptor.value);
    return descriptor;
  };
};
