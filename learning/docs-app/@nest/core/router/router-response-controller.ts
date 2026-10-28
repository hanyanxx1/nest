interface ResponseAdapter {
  reply(response: unknown, body: unknown, statusCode?: number): unknown;
}

export class RouterResponseController {
  constructor(private readonly applicationRef: ResponseAdapter) {}

  apply(result: unknown, response: unknown, statusCode?: number): unknown {
    // 例如 result 可以是 'Hello from Nest' 或 [{ name: 'Mimi' }]。
    // 具体如何写入 HTTP 响应，由底层适配器负责。
    return this.applicationRef.reply(response, result, statusCode);
  }
}
