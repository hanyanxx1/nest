// 加载 Reflect 元数据能力，供装饰器把标记写在被装饰的类上。
import 'reflect-metadata';
import { INJECTABLE_WATERMARK } from '../../constants.js';

// 标记一个类可以作为 provider 使用；例如 @Injectable() 装饰 AppService。
export function Injectable(): ClassDecorator {
  return (target: Function) => {
    // 将 true 写在类上，之后可用 Reflect.getMetadata 读取。
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
  };
}
