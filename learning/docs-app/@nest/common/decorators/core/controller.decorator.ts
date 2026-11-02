import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA, HOST_METADATA } from '../../constants.js';

export function Controller(prefix: string | string[] | ControllerOptions = '/'): ClassDecorator {
  const options = typeof prefix === 'string' || Array.isArray(prefix) ? { path: prefix } : prefix;

  return (target: Function) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
    Reflect.defineMetadata(PATH_METADATA, options.path ?? '/', target);
    if (options.host !== undefined) {
      Reflect.defineMetadata(HOST_METADATA, options.host, target);
    }
  };
}

interface ControllerOptions {
  path?: string | string[];
  host?: string;
}
