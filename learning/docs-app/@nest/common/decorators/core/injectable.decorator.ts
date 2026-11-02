// 加载 Reflect 元数据能力，供装饰器把标记写在被装饰的类上。
import 'reflect-metadata';
import { INJECTABLE_WATERMARK } from '../../constants.js';

export function Injectable(): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
  };
}
