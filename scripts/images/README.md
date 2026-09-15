# scripts/images

[`Scripts README`](../README.md) · [`Repository map`](../../INDEX.md)

把图像文件放入这里，然后运行：

```bash
node scripts/convert-images.mjs              # convert all to WebP (q=75), output to scripts/images/out
node scripts/convert-images.mjs jpg          # convert all to JPG (q=80, mozjpeg, 4:2:0)
node scripts/convert-images.mjs avif --quality 50
node scripts/convert-images.mjs --help
```

脚本不会修改源文件；输出写入 `scripts/images/out/`，并保留子目录结构。再次运行时会跳过已有输出；传入 `--overwrite` 可强制重新编码。

`scripts/images/out/` 已加入 gitignore。目录通过已跟踪的 `README.md` 和 `.gitignore` 保持可发现，不需要占位 `.gitkeep` 文件。
