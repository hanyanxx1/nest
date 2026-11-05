export class Logger {
  constructor(private readonly context?: string) {}

  log(message: string): void {
    console.log(this.format(message));
  }

  warn(message: string): void {
    console.warn(this.format(message));
  }

  error(message: string): void {
    console.error(this.format(message));
  }

  private format(message: string): string {
    // 集中添加上下文，让调用方使用统一的日志格式。
    return this.context ? `[${this.context}] ${message}` : message;
  }
}
