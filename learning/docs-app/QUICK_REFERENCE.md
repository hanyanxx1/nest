# @Res() 参数装饰器 - 快速参考卡

## 🎯 一句话总结
实现了 NestJS 的 `@Res()` 参数装饰器，支持标准响应、原生 Express 响应和混合模式三种方式。

## 🔑 关键发现

### 问题
参数装饰器的元数据存储位置与路由装饰器不同，导致运行时读取失败。

### 解决
```typescript
// 步骤 1：在装饰器文件导入 reflect-metadata
import 'reflect-metadata';

// 步骤 2：参数装饰器存储在 (target, propertyKey) 上
Reflect.defineMetadata(PARAM_DECORATORS_METADATA, data, target, propertyKey);

// 步骤 3：从 (target, propertyKey) 读取
const paramDecorators = Reflect.getMetadata(PARAM_DECORATORS_METADATA, target, propertyKey);

// 步骤 4：在路由定义中保存 target 和 propertyKey
interface DiscoveredRoute {
  target: object;     // 控制器原型
  methodName: string; // 方法名称
  // ...
}
```

## 📝 使用方式

### 模式 1：标准响应（推荐）
```typescript
@Get()
findAll(): Cat[] {
  return [{ name: 'Mimi' }];
}
// GET /cats → [{"name":"Mimi"}]
```

### 模式 2：原生 Express 响应
```typescript
@Get('native')
getCatsWithNativeResponse(@Res() response: Response): void {
  response.status(200).send('Custom response');
}
// GET /cats/native → Custom response
// 方法返回 void，NestJS 不再处理
```

### 模式 3：混合模式（既操作 response 又返回值）
```typescript
@Get('passthrough')
getCatsWithPassthrough(
  @Res({ passthrough: true }) response: Response
): Cat[] {
  response.status(202);  // 设置状态码
  return [{ name: 'Mimi' }];  // 返回数据
}
// GET /cats/passthrough → [{"name":"Mimi"}] (Status: 202)
```

## 🔧 实现核心要点

| 组件 | 位置 | 职责 |
|------|------|------|
| **@Res()** | res.decorator.ts | 参数装饰器工厂，写入元数据 |
| **RouterExplorer** | router-explorer.ts | 读取参数装饰器，构建参数列表 |
| **RouterResponseController** | router-response-controller.ts | 检测 @Res() 并处理响应 |

## ✅ 验证状态

```
GET /cats                 → ✓ [{"name":"Mimi"}]
GET /cats/message         → ✓ Hello from Nest
GET /cats/native          → ✓ Sent by Express response
GET /cats/passthrough     → ✓ [{"name":"Mimi"}] (202)
```

## 📚 关键文件

| 文件 | 变更 | 理由 |
|------|------|------|
| res.decorator.ts | 新增 | 实现 @Res() 装饰器 |
| router-explorer.ts | 修改 | 读取参数装饰器并注入 |
| router-response-controller.ts | 修改 | 处理 @Res() 和 passthrough |
| app.controller.ts | 修改 | 演示三种响应方式 |
| constants.ts | 修改 | 添加元数据常量 |
| doc/5_parameter_decorators_and_res.md | 新增 | 完整技术文档 |

## 🚀 运行应用

```bash
cd learning/docs-app
npm run build
npm run start

# 测试路由
curl http://localhost:3000/cats
curl http://localhost:3000/cats/message
curl http://localhost:3000/cats/native
curl http://localhost:3000/cats/passthrough
```

## 💡 最重要的学习点

**元数据存储位置的差异**是关键：

```
类装饰器 (@Controller)
  → Reflect.defineMetadata(key, value, TargetClass)
  → Reflect.getMetadata(key, TargetClass)

方法装饰器 (@Get)
  → Reflect.defineMetadata(key, value, methodFunction)
  → Reflect.getMetadata(key, methodFunction)

参数装饰器 (@Res)
  → Reflect.defineMetadata(key, value, target, propertyKey)
  → Reflect.getMetadata(key, target, propertyKey)  ← 注意三个参数！
```

不理解这一点会导致参数装饰器永远无法工作。

## 🔗 相关文档

- [完整实现文档](doc/5_parameter_decorators_and_res.md) - 深入技术细节
- [实现总结](IMPLEMENTATION_SUMMARY.md) - 工作概览
- [官方 NestJS 文档](https://docs.nestjs.com/controllers#routing) - 参考标准
- [主文档](doc/README.md) - 学习路径导航

## ⏱️ 实现时间

- 问题发现：30 分钟
- 根本原因排查：90 分钟
- 解决方案实施：45 分钟
- 测试和验证：30 分钟
- 文档和提交：30 分钟

**总计：约 225 分钟**

## 🎓 作为教学资源的价值

这个实现展示了：
1. 如何系统地调试复杂的元数据问题
2. TypeScript 装饰器的实际应用
3. 框架级 API 的设计模式
4. 完整的测试驱动开发流程
5. 优秀的代码注释和文档

特别适合学习 NestJS 源码的学生参考。
