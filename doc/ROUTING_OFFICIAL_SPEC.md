# 官方NestJS文档 - Routing 小节完整规范

基于 https://docs.nestjs.com/controllers 的 Routing 部分提取

## 文档结构概览

官方文档中 Routing 小节包含以下主要内容：

### 1. 基础路由 (Basic Routing)

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
```
- 路由：`GET /cats`
- Controller前缀 + method装饰器路径 = 最终路由

### 2. 路由参数 (Route Parameters)

```typescript
@Get('breed')
findBreeds(): string {
  return 'This action returns all cat breeds';
}
```
- 路由：`GET /cats/breed`
- 支持路径组合

### 3. 多个HTTP方法

```typescript
@Controller('cats')
export class CatsController {
  @Post()
  create(): string {
    return 'This action adds a new cat';
  }

  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
```
- 支持 @Get, @Post, @Put, @Delete, @Patch, @Options, @Head, @All

### 4. 通配符路由 (Wildcard Routes)

```typescript
@Get('abcd/*')
findAll() {
  return 'This route uses a wildcard';
}
```
- 使用 `*` 作为通配符
- 例如：`GET /cats/abcd/xyz` 会被匹配

### 5. 路由冲突处理 (Route Conflict Resolution)

```typescript
// 存在冲突：:id 会先匹配 'me'
@Controller('users')
export class UsersController {
  @Get(':id')
  findOne() {}

  @Get('me') // never reached: `:id` matches "me" first
  findMe() {}
}
```

**解决方案 1：调整路由顺序**
- 在代码中将更具体的路由放在参数化路由之前

**解决方案 2：使用 routeConflictPolicy**
```typescript
const app = await NestFactory.create(AppModule, {
  routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
});
```

**解决方案 3：使用 routeResolutionStrategy**
```typescript
const app = await NestFactory.create(AppModule, {
  routeResolutionStrategy: 'specificity',
});
```

---

## 请求对象 (Accessing Request)

### 方式1：@Req() 装饰器

```typescript
import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(@Req() request: Request): string {
    return 'This action returns all cats';
  }
}
```

### 方式2：@Bind() 装饰器

```typescript
import { Controller, Bind, Get, Req } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  @Get()
  @Bind(Req())
  findAll(request) {
    return 'This action returns all cats';
  }
}
```

---

## 路由参数 (Route Parameters)

### @Param() 装饰器

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return `This action returns a #${id} cat`;
}
```

### 带 Schema 验证

```typescript
@Get(':id')
findOne(@Param('id', { schema: z.coerce.number().int().positive() }) id: number) {
  return this.catsService.findOne(id);
}
```

---

## 查询参数 (Query Parameters)

```typescript
@Get()
findAll(@Query() query: FindAllQuery): Cat[] {
  return this.catsService.findAll(query);
}

// 或具体字段：
@Get()
findAll(@Query('age') age: number, @Query('breed') breed: string) {
  return this.catsService.findAll({ age, breed });
}
```

---

## 请求体 (Request Body)

### 基础用法

```typescript
@Post()
create(@Body() createCatDto: CreateCatDto) {
  return this.catsService.create(createCatDto);
}
```

### 带 Schema 验证

```typescript
@Post()
@HttpCode(201)
create(@Body({ schema: createCatSchema }) createCatDto: CreateCatDto) {
  return this.catsService.create(createCatDto);
}
```

---

## 响应状态码 (HTTP Status Codes)

### @HttpCode() 装饰器

```typescript
@Post()
@HttpCode(204)
create() {
  return 'This action adds a new cat';
}
```

默认：
- POST → 201
- GET/PUT/DELETE 等 → 200
- 可以用 @HttpCode() 覆盖

---

## 响应头 (Response Headers)

### @Header() 装饰器

```typescript
@Post()
@Header('Cache-Control', 'no-store')
create() {
  return 'This action adds a new cat';
}
```

---

## 重定向 (Redirects)

### @Redirect() 装饰器

```typescript
@Get()
@Redirect('https://nestjs.com', 301)
getDocs() {
  return;
}
```

### 动态重定向

```typescript
@Get('docs')
@Redirect('https://docs.nestjs.com', 302)
getDocs(@Query('version') version) {
  if (version && version === '5') {
    return { url: 'https://docs.nestjs.com/v5/' };
  }
}
```

---

## 异步处理

Nest 支持异步返回值：

```typescript
// Promise
@Get()
async findAll(): Promise<Cat[]> {
  return await this.catsService.findAll();
}

// Observable (RxJS)
@Get()
findAll(): Observable<Cat[]> {
  return this.catsService.findAll();
}
```

---

## 小结：覆盖清单

| 功能 | 代码示例 | 说明 |
|------|--------|------|
| 基础路由 | `@Get()` / `@Post()` 等 | ✓ 核心 |
| 路径参数 | `@Get(':id')` | ✓ 核心 |
| 路径组合 | `@Controller('cats')` + `@Get('breed')` | ✓ 核心 |
| 通配符 | `@Get('abcd/*')` | 支持 |
| 冲突处理 | routeConflictPolicy, routeResolutionStrategy | 支持 |
| @Req | `@Req() request: Request` | ✓ 支持 |
| @Param | `@Param('id') id: string` | ✓ 支持 |
| @Query | `@Query('age') age: number` | ✓ 支持 |
| @Body | `@Body() createCatDto` | ✓ 支持 |
| @HttpCode | `@HttpCode(204)` | ✓ 支持 |
| @Header | `@Header('Cache-Control', 'no-store')` | ✓ 支持 |
| @Redirect | `@Redirect('https://...')` | ✓ 支持 |
| 异步 | Promise / Observable | ✓ 支持 |

---

## 你当前的实现情况

根据检查，你的实现目前包括：

✓ 基础路由 (@Controller, @Get, @Post 等)
✓ 路径组合 (prefix + path)
✓ 多路径支持
✓ 装饰器注解文档

❌ 缺少的：
- @Param 参数提取
- @Query 查询参数
- @Body 请求体
- @HttpCode 状态码
- @Header 响应头
- @Redirect 重定向
- @Req/@Res 请求/响应对象
- 参数验证 (Schema)
- 异步 Promise/Observable

