import 'reflect-metadata';
import { OPTIONAL_DEPS_METADATA } from '../../constants.js';

export function Optional(): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    // 记录可选参数的位置，供之后的依赖解析阶段读取。
    const optionalDependencies: number[] = Reflect.getOwnMetadata(OPTIONAL_DEPS_METADATA, target) ?? [];

    Reflect.defineMetadata(OPTIONAL_DEPS_METADATA, [...optionalDependencies, parameterIndex], target);
  };
}
