import 'reflect-metadata';
import { NestApplication } from './nest-application.js';
export declare class NestFactory {
  static create(moduleType: Function): Promise<NestApplication>;
}
