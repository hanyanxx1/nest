import { PROPERTY_DEPS_METADATA } from '../../constants.js';

type PropertyDependency = {
  key: string | symbol;
  type: Function;
};

export function Inject(token: Function): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // 保存属性注入的 token 元数据；具体赋值由容器在实例创建后完成。
    const properties: PropertyDependency[] = Reflect.getMetadata(PROPERTY_DEPS_METADATA, target.constructor) ?? [];

    const updatedProperties = [
      ...properties.filter((property) => property.key !== propertyKey),
      { key: propertyKey, type: token },
    ];

    Reflect.defineMetadata(PROPERTY_DEPS_METADATA, updatedProperties, target.constructor);
  };
}
