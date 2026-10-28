import 'reflect-metadata';
import type { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface.js';

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function) => {
    for (const [key, value] of Object.entries(metadata)) {
      Reflect.defineMetadata(key, value, target);
    }
  };
}
