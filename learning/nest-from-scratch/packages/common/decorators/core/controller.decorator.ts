import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA } from '../../constants.js';

export function Controller(prefix: string | string[] = '/'): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
    // 例如 @Controller('cats') 写入 'cats'；无参 @Controller() 写入默认路径 '/'。
    Reflect.defineMetadata(PATH_METADATA, prefix, target);
  };
}
