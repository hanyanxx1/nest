type SegmentKind = 'literal' | 'param' | 'wildcard';
type SegmentKindOrMissing = SegmentKind | 'end' | 'missing';

interface PathRoute {
  path: string;
}

export class RouteSpecificitySorter {
  private static readonly SEGMENT_KIND_RANK: Record<SegmentKindOrMissing, number> = {
    literal: 0,
    end: 1,
    param: 2,
    wildcard: 3,
    missing: 4,
  };

  static sort<T extends PathRoute>(routes: readonly T[]): T[] {
    // 🟡 断点位置：第 22 行 (执行 routes.map)
    // [当前局部变量]: routes = [4个对象]
    // [按 F10 单步执行后]: 生成 ordered 数组，每个元素带上原代码声明索引
    // [变量面板 ordered 当前值]:
    //   ordered[0] = { route: { path: '/api/{*wildcard}' }, declarationIndex: 0 }
    //   ordered[1] = { route: { path: '/api/users/:id' },   declarationIndex: 1 }
    //   ordered[2] = { route: { path: '/api/users/admin' }, declarationIndex: 2 }
    //   ordered[3] = { route: { path: '/api/users' },       declarationIndex: 3 }
    const ordered = routes.map((route, declarationIndex) => ({ route, declarationIndex }));

    // 🟡 断点位置：第 31 行 (进入 ordered.sort 回调)
    // JS 引擎启动实际排序：依次把相邻/待定位的两个元素取出来比对
    ordered.sort((left, right) => {
      // ---------------------------------------------------------------------------------
      // ⏸️ 命中断点：sort 触发第 1 次比对 (拿 ordered[1] 与 ordered[0] 比)
      //    [当前变量]: left = ordered[1] ('/api/users/:id'), right = ordered[0] ('/api/{*wildcard}')
      //    [F11 步入 comparePaths 后返回]: specificity = -3 (负数)
      //
      // ⏸️ 命中断点：sort 触发第 2 次比对 (拿 ordered[2] 与 ordered[1] 比)
      //    [当前变量]: left = ordered[2] ('/api/users/admin'), right = ordered[1] ('/api/users/:id')
      //    [F11 步入 comparePaths 后返回]: specificity = -2 (负数)
      //
      // ⏸️ 命中断点：sort 触发第 3 次比对 (拿 ordered[3] 与 ordered[1] 比)
      //    [当前变量]: left = ordered[3] ('/api/users'), right = ordered[1] ('/api/users/:id')
      //    [F11 步入 comparePaths 后返回]: specificity = -1 (负数)
      //
      // ⏸️ 命中断点：sort 触发第 4 次比对 (拿 ordered[3] 与 ordered[2] 比，争夺前两名)
      //    [当前变量]: left = ordered[3] ('/api/users'), right = ordered[2] ('/api/users/admin')
      //    [F11 步入 comparePaths 后返回]: specificity = 1 (正数)
      // ---------------------------------------------------------------------------------
      const specificity = this.comparePaths(left.route.path, right.route.path);

      // 🟡 断点位置：第 52 行 (判定是否平局)
      // [单步状态跟踪]:
      // - 第 1 次: specificity 是 -3 ( !== 0 成立)，跳过冒号后半截，直接返回 -3！(把 /api/users/:id 往前移)
      // - 第 2 次: specificity 是 -2 ( !== 0 成立)，跳过冒号后半截，直接返回 -2！(把 /api/users/admin 往前移)
      // - 第 3 次: specificity 是 -1 ( !== 0 成立)，跳过冒号后半截，直接返回 -1！(把 /api/users 往前移)
      // - 第 4 次: specificity 是 1  ( !== 0 成立)，跳过冒号后半截，直接返回 1！ (确定 admin 比 users 更靠前)
      return specificity !== 0 ? specificity : left.declarationIndex - right.declarationIndex;
    });

    // 🟡 断点位置：第 60 行 (排序完毕，解包 map)
    // [按 F10 单步执行后]:
    // [变量面板返回值]:
    //   [0]: { path: '/api/users/admin' }  (第1名)
    //   [1]: { path: '/api/users' }        (第2名)
    //   [2]: { path: '/api/users/:id' }    (第3名)
    //   [3]: { path: '/api/{*wildcard}' }   (第4名)
    return ordered.map(({ route }) => route);
  }

  private static comparePaths(leftPath: string, rightPath: string): number {
    // 🟡 断点位置：第 72 行 (执行 tokenizePath 切割左路径)
    // [单步执行实况]:
    // - 若入参 leftPath 是 '/api/users':       leftSegments 被赋值为 ['literal', 'literal']
    // - 若入参 leftPath 是 '/api/users/admin': leftSegments 被赋值为 ['literal', 'literal', 'literal']
    // - 若入参 leftPath 是 '/api/users/:id':   leftSegments 被赋值为 ['literal', 'literal', 'param']
    const leftSegments = this.tokenizePath(leftPath);

    // 🟡 断点位置：第 79 行 (执行 tokenizePath 切割右路径)
    // [单步执行实况]:
    // - 若入参 rightPath 是 '/api/{*wildcard}': rightSegments 被赋值为 ['literal', 'wildcard']
    // - 若入参 rightPath 是 '/api/users/:id':   rightSegments 被赋值为 ['literal', 'literal', 'param']
    // - 若入参 rightPath 是 '/api/users/admin': rightSegments 被赋值为 ['literal', 'literal', 'literal']
    const rightSegments = this.tokenizePath(rightPath);

    // 🟡 断点位置：第 86 行 (计算比较轮次上限)
    // [单步执行实况]:
    // - 比对 '/api/users'(2段) 与 '/api/users/:id'(3段) 时: Math.max(2, 3) -> longestPathLength = 3
    // - 比对 '/api/users/admin'(3段) 与 '/api/users/:id'(3段) 时: Math.max(3, 3) -> longestPathLength = 3
    const longestPathLength = Math.max(leftSegments.length, rightSegments.length);

    // 🟡 断点位置：第 92 行 (计算左侧越界哨兵)
    // [单步执行实况]:
    // - 比对 '/api/users' 时: 不含 wildcard -> leftEndKind 赋值为 'end'
    // - 比对 '/api/{*wildcard}' 时: 含 wildcard -> leftEndKind 赋值为 'missing'
    const leftEndKind = this.getEndKind(leftSegments);

    // 🟡 断点位置：第 98 行 (计算右侧越界哨兵)
    // [单步执行实况]:
    // - 比对 '/api/{*wildcard}' 时: 含 wildcard -> rightEndKind 赋值为 'missing'
    // - 比对 '/api/users/:id' 时: 不含 wildcard -> rightEndKind 赋值为 'end'
    const rightEndKind = this.getEndKind(rightSegments);

    // 🟡 断点位置：第 104 行 (进入逐段比较的 for 循环)
    for (let index = 0; index < longestPathLength; index += 1) {
      // 🟡 断点位置：第 106 行 (读取左段类型)
      // 【单步变量监控示例：比对 left('/api/users') 与 right('/api/users/:id') 时】:
      //   - 循环 index = 0: leftSegments[0] 是 'literal' -> leftKind 赋值为 'literal'
      //   - 循环 index = 1: leftSegments[1] 是 'literal' -> leftKind 赋值为 'literal'
      //   - 循环 index = 2: leftSegments[2] 是 undefined(越界!) -> ?? 触发，leftKind 赋值为 leftEndKind ('end')
      const leftKind = leftSegments[index] ?? leftEndKind;

      // 🟡 断点位置：第 113 行 (读取右段类型)
      // 【单步变量监控示例：比对 left('/api/users') 与 right('/api/users/:id') 时】:
      //   - 循环 index = 0: rightSegments[0] 是 'literal' -> rightKind 赋值为 'literal'
      //   - 循环 index = 1: rightSegments[1] 是 'literal' -> rightKind 赋值为 'literal'
      //   - 循环 index = 2: rightSegments[2] 是 'param'   -> rightKind 赋值为 'param'
      const rightKind = rightSegments[index] ?? rightEndKind;

      // 🟡 断点位置：第 120 行 (计算得分分差)
      // 【单步计算监控示例：比对 left('/api/users') 与 right('/api/users/:id') 时】:
      //   - index = 0: 0 - 0 -> rankDifference 赋值为 0
      //   - index = 1: 0 - 0 -> rankDifference 赋值为 0
      //   - index = 2: 查表 RANK['end'](1) - RANK['param'](2) -> rankDifference 赋值为 -1
      //
      // 【单步计算监控示例：比对 left('/api/users/admin') 与 right('/api/users/:id') 时】:
      //   - index = 2: 查表 RANK['literal'](0) - RANK['param'](2) -> rankDifference 赋值为 -2
      //
      // 【单步计算监控示例：比对 left('/api/users/:id') 与 right('/api/{*wildcard}') 时】:
      //   - index = 1: 查表 RANK['literal'](0) - RANK['wildcard'](3) -> rankDifference 赋值为 -3
      //
      // 【单步计算监控示例：比对 left('/api/users') 与 right('/api/users/admin') 时】:
      //   - index = 2: 查表 RANK['end'](1) - RANK['literal'](0) -> rankDifference 赋值为 1
      const rankDifference = this.SEGMENT_KIND_RANK[leftKind] - this.SEGMENT_KIND_RANK[rightKind];

      // 🟡 断点位置：第 137 行 (判断本层是否分出胜负)
      // [单步分支跳转跟踪]:
      // - 遇到 index = 0 时: rankDifference 是 0，0 !== 0 为 false，黄标直接跳过 if 块，回到第 104 行 index++
      // - 遇到 index = 1 时: 若差值依然是 0，继续跳过 if 块，回到第 104 行 index++
      // - 遇到 index = 2 时: rankDifference 是 -1 (或 -2、1)，条件成立，黄色箭头单步步入 if 块内部！
      if (rankDifference !== 0) {
        // 🟡 断点位置：第 143 行 (命中胜负，单步退出方法)
        // [按 F10 单步执行]:
        //   - 直接 return rankDifference，跳出整个 for 循环，立即结束本轮 comparePaths 执行！
        return rankDifference;
      }
    }

    // 🟡 断点位置：第 149 行 (全比完平局兜底)
    // 只有所有段类型完全相等时才会执行到此，场景 6 中不会走到这一行
    return 0;
  }

  private static tokenizePath(path: string): SegmentKind[] {
    return (
      path
        // 🟡 断点位置：第 156 行 (按斜杠切开)
        // [单步观察]: path = '/api/users/:id' 执行后 -> 变成 ['', 'api', 'users', ':id']
        .split('/')
        // 🟡 断点位置：第 159 行 (过滤空串)
        // [单步观察]: 数组过滤后 -> 变成 ['api', 'users', ':id']
        .filter(Boolean)
        // 🟡 断点位置：第 162 行 (进入 map 回调循环)
        .map((segment) => {
          // 🟡 断点位置：第 164 行 (通配符判断)
          // - segment = '{*wildcard}' 时: segment.startsWith('{*') 为 true -> 单步步入 if 块
          if (segment.startsWith('*') || (segment.startsWith('{*') && segment.endsWith('}'))) {
            // 🟡 断点位置：第 167 行 -> return 'wildcard'
            return 'wildcard';
          }

          // 🟡 断点位置：第 171 行 (动态参数判断)
          // - segment = ':id' 时: segment.startsWith(':') 为 true -> 单步步入 if 块
          if (segment.startsWith(':')) {
            // 🟡 断点位置：第 174 行 -> return 'param'
            return 'param';
          }

          // 🟡 断点位置：第 178 行 (静态字面量兜底)
          // - segment = 'api'、'users'、'admin' 时: 上述 if 全部跳过，单步走到这 -> return 'literal'
          return 'literal';
        })
    );
  }

  private static getEndKind(segments: SegmentKind[]): SegmentKindOrMissing {
    // 🟡 断点位置：第 185 行 (检查是否包含通配符)
    // [单步观察]:
    // - segments = ['literal', 'wildcard'] 时: segments.includes('wildcard') 为 true -> 走到问号后，返回 'missing'
    // - segments = ['literal', 'literal'] 时: segments.includes('wildcard') 为 false -> 走到冒号后，返回 'end'
    return segments.includes('wildcard') ? 'missing' : 'end';
  }
}

// ==========================================
// 2. 调试辅助打印工具
// ==========================================

// function runTestCase(caseName: string, inputRoutes: string[], expectedRoutes: string[]) {
//   console.log(`\n======================================================`);
//   console.log(`🧪 【测试用例】: ${caseName}`);
//   console.log(`📥 原始声明顺序: [ ${inputRoutes.map((p) => `"${p}"`).join(', ')} ]`);

//   const inputObj = inputRoutes.map((path) => ({ path }));
//   const sortedObj = RouteSpecificitySorter.sort(inputObj);
//   const actualRoutes = sortedObj.map((r) => r.path);

//   console.log(`📤 排序挂载顺序: [ ${actualRoutes.map((p) => `"${p}"`).join(', ')} ]`);

//   const isPassed = JSON.stringify(actualRoutes) === JSON.stringify(expectedRoutes);
//   if (isPassed) {
//     console.log(`✅ 测试通过！符合预期`);
//   } else {
//     console.error(`❌ 测试失败！`);
//     console.error(`   期望输出: [ ${expectedRoutes.join(', ')} ]`);
//     console.error(`   实际输出: [ ${actualRoutes.join(', ')} ]`);
//   }
// }

// // ==========================================
// // 3. 六大核心场景用例调试
// // ==========================================

// // 场景 1：经典遮蔽反转（你的 E2E 测试场景）
// // 业务含义：开发者代码里先写了带参通用路由 :id，后面写了具体接口 me。
// // 预期效果：'literal' (0分) 胜过 'param' (2分)，me 必须排到前面。
// runTestCase(
//   '场景 1：动态参数被静态字面量优先提拔 (Shadowing Inversion)',
//   ['/users/:id', '/users/me'],
//   ['/users/me', '/users/:id'],
// );

// // 场景 2：通配符让路给静态路由与参数路由
// // 业务含义：文件或静态资源托管接口包含通配符，普通接口不能被通配符吞掉。
// // 预期效果：literal (0) > param (2) > wildcard (3)
// runTestCase(
//   '场景 2：通配符 (Wildcard) 必须垫底',
//   ['/files/{*path}', '/files/avatar', '/files/:category'],
//   ['/files/avatar', '/files/:category', '/files/{*path}'],
// );

// // 场景 3：长短路径与通配符虚拟缺失段 (getEndKind 触发 'missing')
// // 业务含义：/files/{*path} 虽然只有 2 段，但它能吞噬多级路径。
// // 预期效果：面对 3 段的具体路径 /files/images/banner，通配符超出的虚拟段是 missing (4分)，必须垫底！
// runTestCase(
//   '场景 3：通配符多级匹配 vs 显式多级具体路由 (EndKind 为 missing)',
//   ['/files/{*path}', '/files/images/banner'],
//   ['/files/images/banner', '/files/{*path}'],
// );

// // 场景 4：短静态路径 vs 长参数路径 (getEndKind 触发 'end')
// // 业务含义：/users 根路径只有 1 段，/users/:id 有 2 段。
// // 预期效果：第 1 轮时 /users 超出，补齐 end (1分)；右边是 param (2分)。1 < 2，短静态路径胜出。
// runTestCase(
//   '场景 4：精确短路径 vs 长动态参数路径 (EndKind 为 end)',
//   ['/users/:id', '/users'],
//   ['/users', '/users/:id'],
// );

// // 场景 5：同级多个动态参数（特异性完全相同，触发稳定排序保序）
// // 业务含义：:id 与 :name 具体程度完全一样（都是 param, 2分），比较差值为 0。
// // 预期效果：退化为 declarationIndex 比较，谁先写谁先挂载。
// runTestCase(
//   '场景 5：权重完全相同的路由，严格保留声明顺序 (Stable Sort)',
//   ['/users/:id', '/users/:name'],
//   ['/users/:id', '/users/:name'],
// );

// // 场景 6：复杂综合大乱斗
// // 业务含义：一个 Controller 里各种路由群魔乱舞，验证整体降序天梯
// runTestCase(
//   '场景 6：综合混杂排序（静态 > 精确短 > 动态参数 > 通配符）',
//   [
//     '/api/{*wildcard}', // wildcard
//     '/api/users/:id', // literal + param
//     '/api/users/admin', // literal + literal (最具体)
//     '/api/users', // literal + end
//   ],
//   [
//     '/api/users/admin', // 第 0: 最具体的静态
//     '/api/users', // 第 1: 精确结束的短路径
//     '/api/users/:id', // 第 2: 单层参数
//     '/api/{*wildcard}', // 第 3: 宽泛通配垫底
//   ],
// );

// ======================================================
// 🧪 【测试用例】: 场景 1：动态参数被静态字面量优先提拔 (Shadowing Inversion)
// 📥 原始声明顺序: [ "/users/:id", "/users/me" ]
// 📤 排序挂载顺序: [ "/users/me", "/users/:id" ]
// ✅ 测试通过！符合预期

// ======================================================
// 🧪 【测试用例】: 场景 2：通配符 (Wildcard) 必须垫底
// 📥 原始声明顺序: [ "/files/{*path}", "/files/avatar", "/files/:category" ]
// 📤 排序挂载顺序: [ "/files/avatar", "/files/:category", "/files/{*path}" ]
// ✅ 测试通过！符合预期

// ======================================================
// 🧪 【测试用例】: 场景 3：通配符多级匹配 vs 显式多级具体路由 (EndKind 为 missing)
// 📥 原始声明顺序: [ "/files/{*path}", "/files/images/banner" ]
// 📤 排序挂载顺序: [ "/files/images/banner", "/files/{*path}" ]
// ✅ 测试通过！符合预期

// ======================================================
// 🧪 【测试用例】: 场景 4：精确短路径 vs 长动态参数路径 (EndKind 为 end)
// 📥 原始声明顺序: [ "/users/:id", "/users" ]
// 📤 排序挂载顺序: [ "/users", "/users/:id" ]
// ✅ 测试通过！符合预期

// ======================================================
// 🧪 【测试用例】: 场景 5：权重完全相同的路由，严格保留声明顺序 (Stable Sort)
// 📥 原始声明顺序: [ "/users/:id", "/users/:name" ]
// 📤 排序挂载顺序: [ "/users/:id", "/users/:name" ]
// ✅ 测试通过！符合预期

// ======================================================
// 🧪 【测试用例】: 场景 6：综合混杂排序（静态 > 精确短 > 动态参数 > 通配符）
// 📥 原始声明顺序: [ "/api/{*wildcard}", "/api/users/:id", "/api/users/admin", "/api/users" ]
// 📤 排序挂载顺序: [ "/api/users/admin", "/api/users", "/api/users/:id", "/api/{*wildcard}" ]
// ✅ 测试通过！符合预期
