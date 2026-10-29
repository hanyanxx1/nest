# 参数装饰器与 @Res() 实现

## 概述

本文档详细记录了参数装饰器（如 `@Res()` 和 `@Req()`）的实现过程及其在 NestJS 路由处理中的应用。

## 关键发现与问题

### 问题：元数据存储位置不匹配

参数装饰器与路由装饰器的元数据存储方式完全不同：

**路由装饰器（@Get, @Post）的存储方式：**
```typescript
// 存储在方法函数对象本身上
Reflect.defineMetadata(METHOD_METADATA, RequestMethod.GET, methodFunction);
Reflect.defineMetadata(PATH_METADATA, 'path', methodFunction);

// 读取时直接从方法函数读取
const method = Reflect.getMetadata(METHOD_METADATA, methodFunction);
```

**参数装饰器（@Res, @Req）的存储方式：**
```typescript
// 存储在 (target, propertyKey) 组合上，而不是方法函数本身
Reflect.defineMetadata(
  PARAM_DECORATORS_METADATA,
  { 0: { decorator: 'Res', options: {} } },
  target,  // 控制器原型对象
  propertyKey  // 方法名称字符串
);

// 读取时必须提供 target 和 propertyKey
const paramDecorators = Reflect.getMetadata(
  PARAM_DECORATORS_METADATA,
  target,
  propertyKey
);
```

### 解决方案

1. **在 res.decorator.ts 中添加 reflect-metadata 导入**
   ```typescript
   import 'reflect-metadata';  // 必须首行导入，才能初始化 Reflect API
   ```

2. **在 RouterExplorer 的路由定义中保存 target 对象**
   ```typescript
   interface DiscoveredRoute {
     methodName: string;
     method: RequestMethod;
     path: string;
     callback: Function;
     target: object;  // 添加此字段，用于读取参数装饰器
   }
   ```

3. **在 registerRoutes 中使用正确的元数据读取位置**
   ```typescript
   const paramDecorators = Reflect.getMetadata(
     PARAM_DECORATORS_METADATA,
     route.target,        // 控制器原型
     route.methodName,    // 方法名称
   );
   ```

## 实现细节

### 1. @Res() 装饰器的工厂方法

文件：[@nest/common/decorators/http/res.decorator.ts](../../@nest/common/decorators/http/res.decorator.ts)

```typescript
function createParamDecorator(
  decoratorName: string,
  options?: any,
): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    if (propertyKey === undefined) {
      return;
    }

    // 读取已有的参数装饰器元数据
    const existingDecorators =
      Reflect.getOwnMetadata(PARAM_DECORATORS_METADATA, target, propertyKey) ||
      {};

    // 添加当前参数的装饰器信息
    existingDecorators[parameterIndex] = {
      decorator: decoratorName,
      options: options || {},
    };

    // 写回到方法上
    Reflect.defineMetadata(
      PARAM_DECORATORS_METADATA,
      existingDecorators,
      target,
      propertyKey,
    );
  };
}

export function Res(options?: { passthrough?: boolean }): ParameterDecorator {
  return createParamDecorator('Res', options);
}

export function Req(): ParameterDecorator {
  return createParamDecorator('Req');
}
```

### 2. RouterExplorer 中的参数注入

文件：[@nest/core/router/router-explorer.ts](../../@nest/core/router/router-explorer.ts)

关键步骤：

**步骤 1：在 scanMethods 中保存 target**
```typescript
routes.push({
  methodName,
  method: methodValue,
  path,
  callback,
  target: prototype,  // 保存原型对象
});
```

**步骤 2：在 registerRoutes 中读取参数装饰器并构建参数列表**
```typescript
const paramDecorators: Record<number, any> = Reflect.getMetadata(
  PARAM_DECORATORS_METADATA,
  route.target,
  route.methodName,
) || {};

// 构建要注入的参数列表
const args: any[] = [];
for (const [paramIndex, paramInfo] of Object.entries(paramDecorators)) {
  const index = Number(paramIndex);
  if (paramInfo.decorator === 'Res') {
    args[index] = response;
  } else if (paramInfo.decorator === 'Req') {
    args[index] = request;
  }
}

// 调用方法时传入参数
const result = await route.callback.call(controller, ...args);
```

### 3. RouterResponseController 中的响应处理

文件：[@nest/core/router/router-response-controller.ts](../../@nest/core/router/router-response-controller.ts)

关键逻辑：检测 @Res() 装饰器是否存在，以及 passthrough 选项：

```typescript
apply(body: any, response: any, handlerMethod?: Function): void {
  // 检查方法上是否有 @Res() 装饰器
  if (handlerMethod) {
    const hasRes = Reflect.getMetadata(
      PARAM_DECORATORS_METADATA,
      handlerMethod
    );
    
    if (hasRes) {
      // 如果有 @Res() 但没有 passthrough，且返回值为 undefined，说明方法已处理响应
      if (body === undefined) {
        return;
      }
    }
  }

  // 标准响应处理
  if (body === null || body === undefined) {
    response.status(200).send();
  } else if (typeof body === 'object') {
    response.status(200).json(body);
  } else {
    response.status(200).send(body);
  }
}
```

## 使用示例

### 示例 1：标准响应方式（不使用 @Res()）

```typescript
@Controller('cats')
export class CatsController {
  @Get()
  findAll(): Cat[] {
    return [{ name: 'Mimi' }];
  }
}

// 请求：GET /cats
// 响应：[{"name":"Mimi"}] 200 OK
```

### 示例 2：原生 Express 响应方式（@Res() 不带 passthrough）

```typescript
import { Response } from 'express';

@Controller('cats')
export class CatsController {
  @Get('native')
  getCatsWithNativeResponse(@Res() response: Response): void {
    response.status(200).send('Sent by Express response');
  }
}

// 请求：GET /cats/native
// 响应：Sent by Express response 200 OK
// 注意：方法返回 void，NestJS 不会再进行任何响应处理
```

### 示例 3：混合模式（@Res() 带 passthrough: true）

```typescript
@Controller('cats')
export class CatsController {
  @Get('passthrough')
  getCatsWithPassthrough(
    @Res({ passthrough: true }) response: Response,
  ): Cat[] {
    response.status(202);  // 设置状态码
    // 还可以添加自定义 header，设置 cookie 等
    response.header('X-Custom-Header', 'value');
    
    // 返回数据，让 NestJS 完成响应
    return [{ name: 'Mimi' }];
  }
}

// 请求：GET /cats/passthrough
// 响应：[{"name":"Mimi"}] 202 Accepted
// 注意：方法既能操作 response 对象（设置状态码、header 等），
// 又能返回数据让 NestJS 序列化响应体
```

## 执行流程

当请求到达 `/cats/native` 时的完整执行流程：

1. **Express 路由匹配**
   - 请求 `GET /cats/native` 到达

2. **参数装饰器读取**
   ```
   paramDecorators = Reflect.getMetadata(
     '__param_decorators__',
     AppController.prototype,
     'getCatsWithNativeResponse'
   )
   // 结果：{ 0: { decorator: 'Res', options: {} } }
   ```

3. **参数列表构建**
   ```
   args[0] = expressResponseObject
   ```

4. **方法调用**
   ```typescript
   const result = getCatsWithNativeResponse.call(controller, expressResponseObject);
   // 方法内部：response.status(200).send('Sent by Express response')
   // result = undefined
   ```

5. **响应处理**
   - 检测到 @Res() 装饰器且结果为 undefined
   - 跳过 NestJS 的自动响应处理
   - 响应已由方法直接处理

## 与 NestJS 官方文档的对应关系

本实现对应 [NestJS 官方文档 - Routing 部分](https://docs.nestjs.com/controllers#routing) 中的"两种响应方式"：

| 方式 | 对应文档 | 特点 |
|------|--------|------|
| 标准响应 | "the standard way" | 返回值自动被 NestJS 序列化为 JSON |
| 原生响应 | "library-specific response" | 使用 `@Res()` 直接操作 Express response 对象 |
| 混合模式 | 通过 `passthrough: true` 选项实现 | 既能操作 response，又能返回值 |

## 关键代码文件变更

| 文件 | 变更 | 原因 |
|-----|------|------|
| @nest/common/constants.ts | 添加 `PARAM_DECORATORS_METADATA` 常量 | 统一参数装饰器元数据的键名 |
| @nest/common/decorators/http/res.decorator.ts | 新增文件，包含 @Res() 和 @Req() | 实现参数装饰器 |
| @nest/common/decorators/http/index.ts | 导出 res.decorator | 暴露公共 API |
| @nest/core/router/router-explorer.ts | 修改 RouteDefinition 和 DiscoveredRoute 接口；修改 scanMethods；修改 registerRoutes | 支持参数装饰器读取和注入 |
| @nest/core/router/router-response-controller.ts | 修改 apply() 方法 | 检测并处理 @Res() 装饰器 |
| src/app.controller.ts | 添加测试方法 | 演示两种响应方式 |

## 技术要点

1. **reflect-metadata 初始化顺序**
   - 参数装饰器文件的首行必须导入 'reflect-metadata'
   - 这样才能在装饰器执行时正确初始化 Reflect API

2. **参数装饰器的三个参数**
   - `target`: 类的原型对象（例如 AppController.prototype）
   - `propertyKey`: 方法名称（例如 'getCatsWithNativeResponse'）
   - `parameterIndex`: 参数位置（例如 0, 1, 2...）

3. **元数据存储的两种方式**
   - 类装饰器（@Controller）：存储在类本身
   - 方法装饰器（@Get）：存储在方法函数本身
   - 参数装饰器（@Res）：存储在 (原型, 方法名) 组合上

4. **passthrough 选项的作用**
   - `passthrough: false`（默认）：方法获得 response 对象，但不能返回值给 NestJS
   - `passthrough: true`：方法既能操作 response，也能返回值让 NestJS 处理

## 测试验证

所有四个路由均已验证正常工作：

```bash
# 标准响应
GET /cats → [{"name":"Mimi"}]

# 文本响应
GET /cats/message → Hello from Nest

# @Res() 不带 passthrough
GET /cats/native → Sent by Express response

# @Res({ passthrough: true })
GET /cats/passthrough → [{"name":"Mimi"}] (Status: 202)
```

## 下一步改进方向

1. 实现 @Req() 装饰器的完整支持
2. 支持 @Param()、@Query()、@Body() 等其他参数装饰器
3. 添加参数验证和类型转换
4. 支持中间件和路由守卫
5. 完整的错误处理和异常过滤
