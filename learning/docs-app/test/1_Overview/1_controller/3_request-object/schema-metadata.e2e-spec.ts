import { Body, Controller, Param, Post, Query, RawBody } from '@nestjs/common';

// 学习版内部保存参数装饰器信息的元数据键，这里直接读取它来观察装饰器写入了什么。
const PARAM_DECORATORS_METADATA = '__param_decorators__';

// 占位管道：本步只检查它被记录进元数据，不会被调用。
class FixturePipe {
  transform(value: unknown): unknown {
    return value;
  }
}

// 手写的最小 Standard Schema：只要有 '~standard' 属性即可，本步不会执行它。
const nameSchema = {
  '~standard': {
    version: 1,
    vendor: 'learning',
    validate: (value: unknown) => ({ value }),
  },
};

@Controller('schema-metadata')
class SchemaMetadataFixtureController {
  // 通过 options 把 schema 附加到 @Body() 参数上。
  @Post()
  create(@Body({ schema: nameSchema }) body: unknown): unknown {
    return body;
  }

  // 通过 options 把 schema 附加到 @Query() 参数上。
  @Post('query')
  search(@Query({ schema: nameSchema }) query: unknown): unknown {
    return query;
  }

  // 带 name 的 @Param，同时附加 schema。
  @Post(':id')
  findOne(@Param('id', { schema: nameSchema }) id: unknown): unknown {
    return id;
  }

  // @RawBody 没有 name，只有 options。
  @Post('raw')
  raw(@RawBody({ schema: nameSchema }) raw: unknown): unknown {
    return raw;
  }

  // 通过 options 把 pipes 附加到 @Body() 参数上。
  @Post('pipes')
  withPipes(@Body({ pipes: [FixturePipe] }) body: unknown): unknown {
    return body;
  }
}

describe('Request data (schema metadata)', () => {
  // 装饰器只负责记录元数据：schema 应出现在该参数的 options 里，且不会被执行或改写。
  it('records the schema passed to @Body in the parameter metadata', () => {
    const metadata = Reflect.getMetadata(
      PARAM_DECORATORS_METADATA,
      SchemaMetadataFixtureController.prototype,
      'create',
    );

    expect(metadata[0].decorator).toBe('Body');
    expect(metadata[0].options.schema).toBe(nameSchema);
  });

  it('records the schema passed to @Query in the parameter metadata', () => {
    const metadata = Reflect.getMetadata(
      PARAM_DECORATORS_METADATA,
      SchemaMetadataFixtureController.prototype,
      'search',
    );

    expect(metadata[0].decorator).toBe('Query');
    expect(metadata[0].options.schema).toBe(nameSchema);
  });

  it('records the schema passed to @Param in the parameter metadata', () => {
    const metadata = Reflect.getMetadata(
      PARAM_DECORATORS_METADATA,
      SchemaMetadataFixtureController.prototype,
      'findOne',
    );

    expect(metadata[0].decorator).toBe('Param');
    expect(metadata[0].options.schema).toBe(nameSchema);
    expect(metadata[0].options.name).toBe('id');
  });

  it('records the schema passed to @RawBody in the parameter metadata', () => {
    const metadata = Reflect.getMetadata(PARAM_DECORATORS_METADATA, SchemaMetadataFixtureController.prototype, 'raw');

    expect(metadata[0].decorator).toBe('RawBody');
    expect(metadata[0].options.schema).toBe(nameSchema);
  });

  it('records the pipes passed to @Body in the parameter metadata', () => {
    const metadata = Reflect.getMetadata(
      PARAM_DECORATORS_METADATA,
      SchemaMetadataFixtureController.prototype,
      'withPipes',
    );

    expect(metadata[0].options.pipes).toEqual([FixturePipe]);
  });
});
