import type { Application } from 'express';
export declare class NestApplication {
  private readonly httpServer;
  constructor(httpServer: Pick<Application, 'listen'>);
  listen(port: string | number): Promise<void>;
}
