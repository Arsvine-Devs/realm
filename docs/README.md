# ARSVINE REALM 文档导航

本目录是 ARSVINE REALM 的维护手册。正文以简体中文为主，代码标识符、命令、文件路径、API 名称和错误信息保留英文。

如果你只是想了解项目，请先阅读仓库根目录的 [`README.md`](../README.md)。如果准备修改代码、内容、资产或部署配置，从本页选择对应阅读路径。

## 按任务阅读

### 首次运行

1. [`GETTING_STARTED.md`](./GETTING_STARTED.md) — 安装运行时、创建本地环境、启动站点。
2. [`DEVELOPMENT.md`](./DEVELOPMENT.md) — 了解目录边界、日常修改入口和开发约定。
3. [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md) — 运行 lint、类型检查、测试和构建。

### 日常开发

1. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — 系统边界与主要数据流。
2. [`ROUTING_AND_I18N.md`](./ROUTING_AND_I18N.md) — App Router、locale、页面过渡和 hash 导航。
3. [`CONTENT_AND_MDX.md`](./CONTENT_AND_MDX.md) — 博客、推文、MDX 与外部内容仓库。
4. [`GOTCHAS.md`](./GOTCHAS.md) — 修改脆弱模块前必须阅读的回归约束。

### 内容与资产维护

1. [`CONTENT_AND_MDX.md`](./CONTENT_AND_MDX.md) — 内容格式、翻译回退和受保护文章边界。
2. [`ASSETS.md`](./ASSETS.md) — COS workspace、Catalog、字体、图片和音频发布。
3. [`CONFIGURATION.md`](./CONFIGURATION.md) — 环境变量与配置入口参考。

### 部署与故障处理

1. [`OPERATIONS.md`](./OPERATIONS.md) — Vercel、自托管、ISR、发布与回滚检查。
2. [`SECURITY.md`](./SECURITY.md) — TOTP、Cookie、限流、路径和外链安全。
3. [`PERFORMANCE.md`](./PERFORMANCE.md) — 自适应性能分级与 WebGL 降级。
4. [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — 按症状排查常见问题。

## 专题索引

| 文档                                                 | 权威范围                           |
| ---------------------------------------------------- | ---------------------------------- |
| [`GETTING_STARTED.md`](./GETTING_STARTED.md)         | 首次安装和启动                     |
| [`DEVELOPMENT.md`](./DEVELOPMENT.md)                 | 日常开发工作流和目录约定           |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md)               | 系统组成、运行边界和数据流         |
| [`ROUTING_AND_I18N.md`](./ROUTING_AND_I18N.md)       | 路由、locale、导航与页面状态       |
| [`CONTENT_AND_MDX.md`](./CONTENT_AND_MDX.md)         | 博客、推文、MDX、内容 locale       |
| [`SECURITY.md`](./SECURITY.md)                       | 认证、授权、Cookie、限流和输入安全 |
| [`ASSETS.md`](./ASSETS.md)                           | COS、Catalog、媒体与字体           |
| [`PERFORMANCE.md`](./PERFORMANCE.md)                 | 性能 tier、能力开关、采样和降级    |
| [`TESTING_AND_QUALITY.md`](./TESTING_AND_QUALITY.md) | 自动化检查与人工验收               |
| [`OPERATIONS.md`](./OPERATIONS.md)                   | 部署、ISR、监控、烟雾测试和恢复    |
| [`CONFIGURATION.md`](./CONFIGURATION.md)             | 环境变量、配置文件和默认值         |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)         | 故障现象、检查方法和修复方向       |
| [`GOTCHAS.md`](./GOTCHAS.md)                         | 历史回归与不可破坏约束             |

## 开发者快速命令

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

常用维护命令：

```bash
pnpm env:sync
pnpm assets:prepare
pnpm assets:build
pnpm assets:publish -- --dry-run
pnpm maintenance:check
```

`pnpm assets:publish` 会操作远程 COS 并调用 revalidation。除非明确准备发布，否则先使用 `--dry-run`。凭据必须只通过当前进程环境传入。

## 文档维护约定

- 一个知识点只保留一个权威位置；其他文档使用链接引用。
- 文档中的路径和命令必须以当前源码、`package.json` 和 `.env.example` 为准。
- 不记录真实密钥、Token、Cookie、TOTP secret 或 COS 凭据。
- 新增或更改路由、环境变量、脚本参数、部署流程时，同步更新对应专题。
- `docs/superpowers/` 保存内部设计记录，不属于普通阅读路径。

## 获取帮助

首次启动失败时阅读 [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)。准备修改受保护文章、导航过渡、WebGL、音乐播放器或资产发布逻辑前，先查阅 [`GOTCHAS.md`](./GOTCHAS.md)。
