# scripts/

构建/资源/开发辅助脚本。**全部用 `node scripts/<name>.mjs` 直接跑**（除两个 Windows `.cmd`/`.ps1`），无 package manager scripts wrapper —— 故意保持脚本"一次性、无依赖、自解释"，方便临时改写。

## 清单

| 脚本                          | 入口                                                          | 何时用                                                                                         |
| ----------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `dev-host-setup.cmd` (`.ps1`) | 双击 / `.\scripts\dev-host-setup.cmd`                         | 本地开发，让 `cdn.arsvine.com` 通过 Referer 白名单（写 hosts + 启动 dev server，退出自动清理） |
| `fetch-google-fonts.mjs`      | `node scripts/fetch-google-fonts.mjs`                         | 改 Google Fonts 选择后，重新生成 `public/_fonts-staging/` 上传到 COS `shared/fonts/`           |
| `convert-images.mjs`          | `node scripts/convert-images.mjs [format] [opts]`             | 批量图片格式转换（webp/jpg/png/avif），输出到 `scripts/images/out/`                            |
| `regen-favicons.mjs`          | `node scripts/regen-favicons.mjs`                             | 从透明源图重新生成 `public/favicon*` + `public/icons/*` 全套                                   |
| `jpg-to-transparent-png.mjs`  | `node scripts/jpg-to-transparent-png.mjs <src.jpg> <dst.png>` | 白底 JPG → 真透明 PNG（alpha unmix 算法，颜色不会染白边）                                      |
| `make-white.mjs`              | `node scripts/make-white.mjs <src> <dst>`                     | 透明 PNG → 白底（OG / Twitter 卡片预览底色用）                                                 |

## `dev-host-setup` 详细

`.cmd` 是入口（双击友好），实际逻辑在 `.ps1`。流程：

1. UAC 自提升（脚本本身不用管理员权限就能起，触发 UAC 后真正干活）。
2. 备份 `C:\Windows\System32\drivers\etc\hosts` 为 `hosts.bak.<日期>`，写入 `127.0.0.1 dev.arsvine.com`。
3. 系统代理开启时，临时把 `dev.arsvine.com` 加进当前用户 `ProxyOverride`（不动系统级代理设置）。
4. 用 `PORT=80` 启动同一个 dev server 入口（`node server.js`）。
5. Ctrl+C → 停 dev server → 还原 ProxyOverride → 回退 hosts → `ipconfig /flushdns`。

子命令：

```bat
.\scripts\dev-host-setup.cmd -HostsOnly    :: 只写 hosts，不启动 dev server
.\scripts\dev-host-setup.cmd -Remove       :: 清理 dev.arsvine.com hosts 条目
```

如果用了 `-HostsOnly`，请手动执行：

```powershell
$env:PORT=80; pnpm dev
```

> 被 X 强关、Ctrl+C 没生效导致 hosts 残留时，跑 `-Remove` 清理。重新跑 `dev-host-setup.cmd` 不会重复写入（脚本检测重复行）。

## `fetch-google-fonts` 详细

读 `src/shared/config/site.ts` 的 `siteConfig.fonts.googleStylesheet`，用现代 Chrome User-Agent 抓 CSS（否则 Google 返回 `.ttf`），下载所有 woff2，把 `url()` 改写为 `cdn.arsvine.com/shared/fonts/<family>/<file>`，写入 `public/_fonts-staging/`（gitignored）。`--check-config` 只验证配置路径与 URL，不访问网络。

生产分发使用 `cos-workspace/coscli-windows-amd64.exe` 上传到 `shared/fonts/`；凭据仅从当前环境传入，不保存到 CLI 配置。脚本输出的 Content-Type 与 Cache-Control 要求仍然适用。

> Variable Font 复用是 Google Fonts 的设计行为：多个 `@font-face` 块的 `font-weight:` 不同但 `src` 指同一个 woff2 文件。脚本的 dedup 按这个机制设计，**不要**改成"每个 weight 一个文件"。

## `convert-images` 详细

```bash
node scripts/convert-images.mjs                  # webp, q=75
node scripts/convert-images.mjs jpg              # jpg, q=80, mozjpeg, 4:2:0
node scripts/convert-images.mjs avif --quality 50
node scripts/convert-images.mjs --help
```

源文件不会被修改；输出在 `scripts/images/out/`（保留子目录结构，gitignored）。再次运行时已存在的输出会跳过 —— `--overwrite` 强制重编。

## 共同约定

- **脚本不入构建链**：不被 `next build` 调用，不会出现在生产产物里。
- **不要把脚本逻辑搬到 `lib/`**：脚本是 Node CLI 上下文，`lib/` 是 Next.js 运行时上下文。两者依赖、模块解析、路径解析都不同。
- **不要 `chmod +x`**：项目主要在 Windows 开发，`.mjs` 直接 `node scripts/foo.mjs` 跑，不依赖 shebang。
- **新增脚本** → 评估是不是真的"一次性、辅助性、不入运行时"。如果要在 dev/prod 都跑，那它属于 `lib/` 或 pnpm script，不是这里。
