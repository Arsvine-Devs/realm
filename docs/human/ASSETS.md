# 媒体与 Catalog

[返回文档索引](../INDEX.md)

平台在 `cdn.arsvine.com/media/` 提供正式站的公开字体、图片和音频。预览保有各自的同源公开媒体入口。Realm 通过独立的只读路径读取私有 Catalog。

| 路径                                                      | 内容                             |
| --------------------------------------------------------- | -------------------------------- |
| `media/public/realm/images/`、`media/public/realm/audio/` | 文件名包含内容 hash 的图片和音频 |
| `media/public/shared/fonts/`                              | 字体和 `google-fonts.css`        |
| `media/private/realm/catalog/current.json`                | 当前版本指针                     |
| `media/private/realm/catalog/versions/`                   | 含源文件元数据的私有版本目录     |

Realm 在处理请求时读取当前版本指针。Catalog 的 `objectKey` 是相对媒体键，页面用平台的公开媒体源生成 URL。

## 生成和发布

媒体源工作区包含 `public-root/realm/`、`public-root/shared/fonts/` 及 `_meta/realm/`。元数据引用源文件，构建将引用转换成文件键和尺寸。运行字体生成脚本后，把生成的样式表和字体家族目录放进 `public-root/shared/fonts/`。

```sh
node scripts/fetch-google-fonts.mjs
pnpm assets:build --workspace /path/to/media-workspace
pnpm assets:publish /path/to/local-media-slot
```

生成程序写入 `dist/media/` 和版本清单。发布先校验并写入公开媒体和私有 Catalog，再原子替换私有指针。已存在的版本文件必须与发布候选的字节一致。Realm 的下一次请求会读取切换后的版本。

在本地目录演练，再通过授权的运维流程发布。验证图片、字体和音频范围请求，核对页面生成的 CDN 地址。
