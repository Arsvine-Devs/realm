# 媒体与 Catalog

[返回文档索引](../INDEX.md)

Realm 使用普通同源 `/media/` 路径提供字体、图片和音频。反向代理只读公开媒体树。Realm 通过独立的只读路径读取私有 Catalog。

| 路径                                                      | 内容                             |
| --------------------------------------------------------- | -------------------------------- |
| `media/public/realm/images/`、`media/public/realm/audio/` | 文件名包含内容 hash 的图片和音频 |
| `media/public/shared/fonts/`                              | 字体和 `google-fonts.css`        |
| `media/public/realm/site-catalog/`                        | 当前版本指针及公开资源清单       |
| `media/private/realm/catalog/versions/`                   | 含源文件元数据的私有版本目录     |

浏览器与 Realm 服务读取同一个公开 `realm/site-catalog/current.json` 来选择版本。Catalog 的 `objectKey` 是相对媒体键，公开清单只包含允许公开的键和展示元数据。

## 生成和发布

媒体源工作区包含 `public-root/realm/`、`public-root/shared/fonts/` 及 `_meta/realm/`。元数据引用源文件，构建将引用转换成文件键和尺寸。运行字体生成脚本后，把生成的样式表和字体家族目录放进 `public-root/shared/fonts/`。

```sh
node scripts/fetch-google-fonts.mjs
pnpm assets:build --workspace /path/to/media-workspace
pnpm assets:publish /path/to/local-media-slot
```

构建写入 `dist/media/` 和版本清单。发布先验证并写入媒体和公私版本目录，再原子替换指针。已存在的版本文件必须与发布候选的字节一致。配置 `REALM_REVALIDATE_ORIGIN` 和 `REVALIDATE_WEBHOOK_SECRET` 后，发布向 Realm 发送签名刷新事件。

在本地目录演练，再通过授权的运维流程发布。验证图片、字体、音频范围请求和公开清单。通过 HTTP 请求私有版本目录应失败。
