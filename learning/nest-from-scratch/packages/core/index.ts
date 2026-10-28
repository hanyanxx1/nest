// main.ts 从 '@nestjs/core' 导入 NestFactory 时，会通过这个公共入口找到手写实现。
export { NestFactory } from './nest-factory.js';

// NestFactory.create() 返回的应用对象需要提供 main.ts 调用的 listen() 方法。
export { NestApplication } from './nest-application.js';
