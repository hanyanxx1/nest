import { HEADERS_METADATA } from '../../constants.js';

interface HeaderMetadata {
  name: string;
  value: string;
}

export const Header = (name: string, value: string): MethodDecorator => {
  return (_target: object, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    // 用数组保存方法上的 header 元数据，允许后续添加多个 header。
    const existingHeaders: HeaderMetadata[] = Reflect.getMetadata(HEADERS_METADATA, descriptor.value) ?? [];
    Reflect.defineMetadata(HEADERS_METADATA, [...existingHeaders, { name, value }], descriptor.value);
    return descriptor;
  };
};
