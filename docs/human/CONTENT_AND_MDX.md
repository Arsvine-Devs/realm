# 内容与 MDX

[返回文档索引](../INDEX.md)

本文说明结构化站点数据、已发布内容、MDX 组件、文章语言和阅读时间。受保护内容的认证细节见 [`SECURITY.md`](./SECURITY.md)。

## 内容来源

项目有两类内容来源：

1. 仓库内 TypeScript 数据：作品、经历、Life、技能、友链和站点配置。
2. `content.arsvine.com` 发布读面：博客索引、已发布 MDX variant 和推文归档。

Realm 在每次请求时读取 Content。Content 从同环境的 PostgreSQL 发布视图读取文章与短帖。Content 暂时不可用时，内容汇总页仍展示作品和经历，独立文章页和短帖页面进入错误状态。开发环境可用 `TWEETS_STRESS_TEST=1` 生成合成归档。

## 结构化数据

常见位置：

```text
src/features/portfolio/contracts/data/
src/features/experience/contracts/data/
src/features/life/contracts/data/
src/features/profile/contracts/skills/
src/features/profile/contracts/friendLinks/
src/shared/config/site.ts
```

一般采用：

```text
index.ts   zh-CN 和 locale fallback
zh-TW.ts
en.ts
```

`src/app/i18n/data.ts` 使用显式静态注册表。不要改成动态 `require()`。

## 文章索引

索引是列表与受保护 metadata 的权威来源。单篇结构：

```json
{
  "slug": "example-post",
  "date": "2026-07-14",
  "updatedAt": "2026-07-14T12:00:00.000Z",
  "tags": ["essay"],
  "pinned": false,
  "access": { "mode": "public" },
  "availableLocales": ["zh-CN", "en"],
  "variants": {
    "zh-CN": {
      "title": "示例文章",
      "excerpt": "摘要"
    },
    "en": {
      "title": "Example Post",
      "excerpt": "Summary",
      "originLocale": "zh-CN"
    }
  }
}
```

规则：

- `slug` 必须是安全的单一路径 segment。
- `availableLocales` 列出可以请求的语言版本。
- 加载正文后会根据实际正文重新计算阅读时间。
- protected post 的公开 metadata 会清空 excerpt、tags 和 reading time。

Content 的语言版本包含 `bodyMdx` 正文。Realm 从文章索引和语言版本读取展示信息。

## 自定义 MDX 组件

常用组件：

| 组件                                   | 用途                                      |
| -------------------------------------- | ----------------------------------------- |
| `<Term note="...">word</Term>`         | 短词、专有名词或缩写的 ruby 注解          |
| `<Explain note="...">phrase</Explain>` | 较长的 tooltip / mobile bottom sheet 说明 |
| `<Spoiler>phrase</Spoiler>`            | 句内涂黑/剧透遮挡，悬停预览、点击固定显示 |
| `<Lead>`                               | 开篇导语                                  |
| `<Aside>`                              | 补充说明块                                |
| `<Mark>`                               | section 标记                              |
| `<Ref>`                                | 引用/参考 section                         |

示例：

```mdx
这是一个 <Term note="作品集">Portfolio</Term>。

<Explain note="移动端会显示为底部说明面板">需要补充解释的短语</Explain>

<Spoiler>需要默认遮挡的剧透内容</Spoiler>
```

`<Spoiler>` 仅用于句内内容。内容默认被涂黑，桌面端悬停或键盘聚焦时渐变显示，点击、Enter 或 Space 后在当前文章中保持显示。当前文章中第 3 个不同的遮挡内容被激活后，会询问是否“全部揭示”当前文章的遮挡内容；提示每次文章内容视图只出现一次。

MDX link 允许安全的 `http:`、`https:`、`mailto:`、站内相对路径和 `#fragment`，拒绝 `javascript:`、`data:`、协议相对 URL 与反斜杠路径。

## 阅读时间

`src/features/blog/server/blog.ts` 使用项目内估算器：

- 分别统计 CJK 字符和 Latin/Cyrillic 单词；
- 去除 fenced code、inline code、HTML/JSX tag 和 MDX import/export；
- 最少返回 1 分钟；
- 当前 CJK 和 Latin 基准均为每分钟对应计数配置。

不要重新引入 whitespace-oriented `reading-time` 包。

## Locale fallback

请求 UI locale 时：

1. 优先同名 content locale。
2. 其次 `zh-CN`。
3. 再选择 `availableLocales` 中第一个受支持 content locale。

状态含义：

| 状态         | 含义                                                       |
| ------------ | ---------------------------------------------------------- |
| `source`     | 当前正文是源 locale                                        |
| `translated` | 当前 UI locale 有正文，但 `originLocale` 指向其他源 locale |
| `fallback`   | 请求 UI locale 没有正文，显示其他 locale                   |

用户在博客详情内选择 `ja`、`ru`、`fr` 时，只切正文 query/state，并抑制不适用的 UI fallback banner。

## Protected post 内容边界

`access` 示例：

```json
{ "mode": "totp", "group": "friends-a" }
```

protected body 不得进入静态 props、HTML 或 RSC payload。页面初始只拿到清理后的 metadata，授权后通过 `/api/post-variant` 获取正文。详细流程见 [`SECURITY.md`](./SECURITY.md)。

## 推文归档

Realm 从 Content 读取公开短帖，按上海时区分月。`/api/tweet-months?offset=&limit=` 只读取请求的月份。空列表表示当前没有公开短帖，读服务故障返回 `503`。

## 发布与撤稿

API 提交修改后，新的文章页面、列表和订阅请求读取已提交状态。草稿、撤下的文章和非公开短帖从发布视图排除。

## 修改检查清单

- 文章索引的语言与可以读取的版本一致。
- 每个 variant 有 title 和 excerpt。
- `originLocale` 只使用 UI locale 合约允许的值。
- protected metadata 不泄漏摘要、tag 或 reading time。
- 自定义组件在 desktop/mobile 都可用键盘和触摸访问。
- 内部链接保持安全，不绕过导航规则。
- 验证文章发布、修改、撤稿及受保护正文加载。

## 相关文档

- [`SECURITY.md`](./SECURITY.md)
- [`ROUTING_AND_I18N.md`](./ROUTING_AND_I18N.md)
- [`OPERATIONS.md`](./OPERATIONS.md)
