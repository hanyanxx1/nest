import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA } from '../../constants.js';

export function Controller(): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
    Reflect.defineMetadata(PATH_METADATA, '/', target);
  };
}
