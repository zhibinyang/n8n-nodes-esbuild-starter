# ESBuild Configuration for n8n Custom Nodes

## 概述

本项目使用 **esbuild** 替代传统的 TypeScript 编译器 (tsc) 来构建 n8n 自定义节点。这种方法专为 **Cloud Run + GCS** 部署场景优化，通过最小化文件数量来提升加载性能。

## 为什么使用 esbuild?

### 传统 tsc 方式的问题

使用 `tsc` 构建时:
- ✗ 每个 `.ts` 文件生成对应的 `.js` 文件
- ✗ 外部依赖的所有文件都被包含 (如使用了某个npm包，其所有源文件都会在 node_modules 中)
- ✗ 大量小文件导致 GCS 挂载性能下降
- ✗ Cloud Run 启动时需要加载数百个文件

### esbuild 方式的优势

使用 `esbuild` 构建时:
- ✓ 每个node/credential打包成**单个**JS文件
- ✓ 外部依赖的代码被bundle进输出文件
- ✓ 最小化文件数量 (本项目: 仅14个文件，104KB)
- ✓ Cloud Run 启动更快，内存占用更低
- ✓ 构建速度极快 (24ms vs 秒级)

## 架构设计

### 打包策略

```
源代码结构:
├── nodes/
│   ├── GithubIssues/
│   │   ├── GithubIssues.node.ts      [入口点]
│   │   ├── shared/utils.ts           [内部依赖]
│   │   ├── resources/issue/get.ts    [内部依赖]
│   │   └── ...
│   └── Example/
│       └── Example.node.ts            [入口点]
└── credentials/
    ├── GithubIssuesApi.credentials.ts [入口点]
    └── ...

构建输出:
dist/
├── nodes/
│   ├── GithubIssues/
│   │   ├── GithubIssues.node.js      [18.1kb - 包含所有内部依赖]
│   │   ├── GithubIssues.node.js.map  [sourcemap]
│   │   └── GithubIssues.node.json    [元数据,必须独立]
│   └── Example/
│       ├── Example.node.js           [3.0kb]
│       └── ...
└── credentials/
    ├── GithubIssuesApi.credentials.js [2.1kb]
    └── ...
```

### 外部依赖管理

**标记为 external (不打包)**:
- `n8n-workflow` - n8n 运行时提供
- `n8n-core` - n8n 运行时提供  
- Node.js 内置模块 (`fs`, `path`, `crypto`, 等)

**打包进 bundle**:
- 所有其他 npm 依赖
- 项目内部模块 (如 `shared/utils.ts`)

验证方法:
```bash
# n8n-workflow 应该是 require() 调用，而非内联代码
grep "n8n-workflow" dist/nodes/GithubIssues/GithubIssues.node.js
# 输出: var import_n8n_workflow = require("n8n-workflow");

# 内部依赖应该被内联，而非 require() 调用
grep -c "shared/utils" dist/nodes/GithubIssues/GithubIssues.node.js
# 输出: 0 或 1 (注释中的引用)
```

## 使用方法

### 构建命令

```bash
# 单次构建
npm run build

# Watch 模式 (自动重建)
npm run build:watch

# 使用原始 n8n-node 构建 (对比用)
npm run build:n8n
```

### 开发工作流

1. **启动 watch 模式**:
   ```bash
   npm run build:watch
   ```

2. **在另一个终端中运行 n8n**:
   ```bash
   # 如果已经 link 到 n8n
   cd /path/to/n8n
   npm start
   
   # 或使用 n8n-node dev (需要另外配置)
   ```

3. **修改代码** → esbuild 自动重建 → 重启 n8n 查看效果

### 添加新节点

1. 在 `nodes/` 或 `credentials/` 下创建新的 `.node.ts` 或 `.credentials.ts` 文件
2. esbuild 会自动检测并打包
3. 更新 `package.json` 的 `n8n.nodes` 或 `n8n.credentials` 数组

### 添加外部依赖

```bash
npm install some-package
```

**重要**: 如果依赖应该是外部的 (由n8n提供),需要在 `esbuild.config.mjs` 的 `external` 数组中添加:

```javascript
const n8nExternals = [
  'n8n-workflow',
  'n8n-core',
  'some-package',  // 添加新的外部依赖
];
```

## 构建输出详解

### 文件类型

| 文件类型 | 说明 | 示例 |
|---------|------|------|
| `*.node.js` | 节点代码bundle | `GithubIssues.node.js` (18.1kb) |
| `*.credentials.js` | 凭证代码bundle | `GithubIssuesApi.credentials.js` (2.1kb) |
| `*.js.map` | Sourcemap文件 | 用于调试 |
| `*.d.ts` | TypeScript类型声明 | 由 tsc 生成 |
| `*.node.json` | 节点元数据 | **必须独立**,n8n用于检测 |
| `*.svg` | 图标文件 | 直接复制 |

### TypeScript 声明文件

虽然使用 esbuild 编译 JS，我们仍然使用 `tsc` 生成类型声明文件:

```bash
# 自动运行 (在 npm run build 后)
npx tsc
```

配置见 `tsconfig.json`:
```json
{
  "declaration": true,
  "emitDeclarationOnly": true  // 只生成 .d.ts，不生成 .js
}
```

## Cloud Run + GCS 部署

### 构建并上传

```bash
# 1. 构建项目
npm run build

# 2. 上传到 GCS
gsutil -m rsync -r dist/ gs://your-bucket/n8n-custom-nodes/

# 3. 重启 Cloud Run (触发重新挂载)
gcloud run services update your-n8n-service --region=your-region
```

### 性能优势

| 指标 | tsc 方式 | esbuild 方式 | 改进 |
|------|---------|-------------|------|
| 文件数量 | ~100+ | 14 | **-86%** |
| 总体积 | ~数MB | 104KB | **显著减少** |
| 构建时间 | ~秒级 | 24ms | **>100x 更快** |
| Cloud Run 启动 | 较慢 | 更快 | **文件I/O减少** |

> **注意**: 实际数值取决于你的node数量和依赖复杂度

## 故障排除

### 构建失败

**错误**: `Cannot find module 'some-module'`

**解决**:
1. 检查是否已安装: `npm install some-module`
2. 如果是n8n提供的模块,添加到 `esbuild.config.mjs` 的 `external` 数组

---

**错误**: `No entry points found`

**解决**:
- 确保文件命名正确: `*.node.ts` 或 `*.credentials.ts`
- 检查文件位置: `nodes/` 或 `credentials/` 目录下

### 运行时错误

**错误**: n8n 无法加载节点

**解决**:
1. 检查 `package.json` 中的 `n8n.nodes` 配置
2. 确保 `.node.json` 文件存在于 dist 中
3. 检查 n8n 日志查看详细错误

---

**错误**: `Module not found: n8n-workflow`

**解决**:
- 这是正常的! `n8n-workflow` 应该由 n8n 运行时提供
- 确保在 n8n 环境中运行,而非独立运行

### Watch 模式问题

**问题**: 修改代码后没有重建

**解决**:
1. 检查 watch 进程是否还在运行
2. 重启 watch: `Ctrl+C` 然后 `npm run build:watch`
3. 检查文件名是否正确 (必须是 `.ts` 文件)

## 配置文件说明

### esbuild.config.mjs

核心配置文件,控制:
- 📦 入口点扫描规则
- 🔒 外部依赖列表
- ⚙️  编译选项 (target, format, etc.)
- 📋 资源文件复制逻辑

### tsconfig.json

配置 TypeScript 类型检查和声明文件生成:
- `emitDeclarationOnly: true` - 只生成 .d.ts
- `declaration: true` - 启用声明文件生成
- 其他选项保持 n8n 推荐配置

### package.json

- `scripts.build` → esbuild 构建
- `scripts.build:n8n` → 原始 tsc 构建 (备用)
- `devDependencies` → 包含 esbuild 和 glob

## 高级技巧

### 分析 Bundle 大小

```bash
npm run build
ls -lh dist/nodes/**/*.js dist/credentials/**/*.js
```

### 对比 tsc 输出

```bash
# esbuild 方式
npm run build
du -sh dist/

# tsc 方式
npm run build:n8n
du -sh dist/
```

### 调试 Bundle 内容

```bash
# 查看某个 bundle 包含了什么
less dist/nodes/GithubIssues/GithubIssues.node.js

# 搜索特定依赖是否被打包
grep "axios" dist/nodes/**/*.js
```

## 参考资源

- [esbuild 官方文档](https://esbuild.github.io/)
- [n8n 节点开发文档](https://docs.n8n.io/integrations/creating-nodes/)
- [Cloud Run 最佳实践](https://cloud.google.com/run/docs/tips)

## 常见问题

**Q: 为什么不使用 webpack 或 rollup?**  
A: esbuild 在构建速度上有巨大优势 (几十毫秒 vs 几秒),且配置更简单。对于 n8n 插件这种规模的项目,esbuild 是最佳选择。

**Q: `.node.json` 文件为什么不能内联?**  
A: n8n 在加载插件时会通过文件名检测 `.node.json` 文件,如果内联到JS中,n8n 将无法发现节点。

**Q: 可以完全移除 TypeScript 吗?**  
A: 不建议。保留 `tsc` 用于生成类型声明文件,这对 IDE 支持和类型安全很重要。

**Q: 多个节点会有重复代码吗?**  
A: 如果多个节点引用相同的内部模块,确实会有重复。但这是刻意的权衡:重复的代码量通常很小,换来的是更少的文件数和更简单的部署。如果重复成为问题,可以修改 esbuild 配置启用 code splitting。
