import type { Application } from 'express';
interface ExpressResponseLike {
  status(statusCode: number): this;
  json(body: unknown): this;
  send(body?: string): this;
}
export declare class ExpressAdapter {
  private readonly httpServer;
  constructor(httpServer: Pick<Application, 'get'>);
  registerGet(path: string, handler: Function): unknown;
  reply(
    response: ExpressResponseLike,
    body: unknown,
    statusCode?: number,
  ): unknown;
}
export {};
