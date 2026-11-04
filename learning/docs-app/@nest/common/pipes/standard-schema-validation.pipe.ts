interface StandardSchemaIssue {
  message: string;
}

type StandardSchemaResult =
  { value: unknown; issues?: never } | { issues: readonly StandardSchemaIssue[]; value?: never };

interface StandardSchema {
  '~standard': {
    validate(value: unknown): StandardSchemaResult | Promise<StandardSchemaResult>;
  };
}

interface PipeMetadata {
  schema?: unknown;
}

// 先检查 schema 结构，避免把不符合约定的对象当成 Standard Schema 调用。
function isStandardSchema(schema: unknown): schema is StandardSchema {
  if (typeof schema !== 'object' || schema === null || !('~standard' in schema)) {
    return false;
  }

  const standard = schema['~standard'];

  return (
    typeof standard === 'object' &&
    standard !== null &&
    'validate' in standard &&
    typeof standard.validate === 'function'
  );
}

// Express 默认错误处理器会读取 status 属性，决定错误响应的 HTTP 状态码。
class StandardSchemaValidationError extends Error {
  readonly status = 400;
}

export class StandardSchemaValidationPipe {
  async transform(value: unknown, metadata: PipeMetadata): Promise<unknown> {
    const schema = metadata.schema;

    // 没有 schema 时保持原值；装饰器允许只使用普通管道。
    if (schema === undefined) {
      return value;
    }

    if (!isStandardSchema(schema)) {
      throw new Error('参数 schema 不符合 Standard Schema 规范');
    }

    const result = await schema['~standard'].validate(value);

    // 暂时显式报告校验失败；转换成 HTTP 400 是下一步。
    if (result.issues !== undefined) {
      throw new StandardSchemaValidationError(
        `Standard Schema 校验失败：${result.issues.map((issue) => issue.message).join('; ')}`,
      );
    }

    // schema 可以转换输入，控制器应收到它返回的 value。
    return result.value;
  }
}
