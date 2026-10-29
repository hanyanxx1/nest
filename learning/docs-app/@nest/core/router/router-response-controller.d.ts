import 'reflect-metadata';
interface ResponseAdapter {
  reply(response: unknown, body: unknown, statusCode?: number): unknown;
}
export declare class RouterResponseController {
  private readonly applicationRef;
  constructor(applicationRef: ResponseAdapter);
  apply(
    result: unknown,
    response: unknown,
    statusCode?: number,
    handlerMethod?: Function,
  ): unknown;
}
export {};
