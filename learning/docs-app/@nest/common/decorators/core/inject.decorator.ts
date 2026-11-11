import { PROPERTY_DEPS_METADATA } from '../../constants.js';

type PropertyDependency = {
  key: string | symbol;
  type: Function;
};

export function Inject(token: Function): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    // 装饰器收到 CatsController.prototype 和属性名 catsService；
    // token 则是本测试要注入的 CatsService 类。
    const properties: PropertyDependency[] = Reflect.getMetadata(PROPERTY_DEPS_METADATA, target.constructor) ?? [];

    const updatedProperties = [
      ...properties.filter((property) => property.key !== propertyKey),
      { key: propertyKey, type: token },
    ];

    Reflect.defineMetadata(PROPERTY_DEPS_METADATA, updatedProperties, target.constructor);
  };
}
