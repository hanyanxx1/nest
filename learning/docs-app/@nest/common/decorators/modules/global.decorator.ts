import 'reflect-metadata';
import { GLOBAL_MODULE_METADATA } from '../../constants.js';

export function Global(): ClassDecorator {
  return (target: Function) => {
    // 这里只标记模块元数据；稍后由模块收集逻辑读取它。
    Reflect.defineMetadata(GLOBAL_MODULE_METADATA, true, target);
  };
}
