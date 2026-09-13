# 腾讯云控制面与资产链路快照

[返回文档组](./README.md)

本文记录 2026-09-13 通过已登录的腾讯云控制台、公开 DNS/HTTP 检查和 Vercel CLI 交叉核验得到的腾讯云侧事实。它是供应商控制面快照，不替代代码中的接口契约；详细的替换边界见 [`SUPPLIER_BOUNDARIES.md`](./SUPPLIER_BOUNDARIES.md)。

腾讯云控制台观察按 `CLAIMED` 处理：它们是当前账户控制面状态，不等同于从外部网络得到的独立运行证明。公开 DNS/HTTP 结果按 `LIVE` 处理。证书验证值、账户 ID、COS bucket 全名、Token 和私有对象路径均不记录。

## 结论

- 腾讯云目前同时承担域名注册、DNSPod 权威解析、COS 对象存储、EdgeOne 边缘层和 SSL 证书管理。
- 长期资产链路是 `cdn.arsvine.com → EdgeOne → COS 媒体桶`；EdgeOne 域名配置显示源站类型为 COS，COS 桶本身保持私有读写。
- Realm 的站点 Catalog 与媒体分发依赖 hash object path、版本化 Catalog 和 `current.json` pointer；COS 原生版本控制没有开启。
- 私有 Catalog 桶启用了多 AZ；公共媒体桶没有启用多 AZ。两只桶都没有对象版本控制或跨地域复制规则。
- 腾讯云传统 CDN 没有开通；`cdn.arsvine.com` 的实际边缘服务是 EdgeOne，不应把 COS CDN 页面上的“未开通 CDN”解释成资产链路失效。
- `private-cdn.arsvine.com` 已按确认从 DNSPod 和 COS 私有 Catalog 桶的自定义源站配置中移除；相关 HTTPS 证书保留但已不再绑定，证书校验 TXT 记录也已由用户手动删除。
- 腾讯云账户当前没有云服务器或轻量应用服务器实例；VPS 迁移时，腾讯云现有角色主要是 DNS、边缘、证书和对象存储，而不是应用计算。

### EdgeOne 与 COS 全球加速

两者是不同层次的能力：EdgeOne 是访客访问 `cdn.arsvine.com` 时经过的边缘缓存/安全层；COS 全球加速是供客户端或上传工具使用的 COS 专用加速域名。两者可以组合，但 EdgeOne 必须显式以 COS 全球加速域名作为源站才会形成双层链路。

当前控制台显示 EdgeOne 使用 COS 默认源站域名，Realm 代码和资产发布脚本也没有引用 COS 全球加速域名；因此不能从桶级开关推导出 Realm 访客流量正在使用它。腾讯云官方说明，实际使用全球加速域名会产生额外加速费用，而默认域名仍可正常使用：[COS 全球加速概述](https://cloud.tencent.com/document/product/436/38866)。本次已关闭公共媒体桶的全球加速开关；关闭后公共 CDN Catalog 只读冒烟请求仍返回 HTTP 200，EdgeOne/COS 链路保持正常。

## 域名、注册与 DNS

### 域名台账

| 项目     | 控制台观察                 | 证据      |
| -------- | -------------------------- | --------- |
| 注册域名 | `arsvine.com`，状态正常    | `CLAIMED` |
| DNS 状态 | DNSPod                     | `CLAIMED` |
| 注册商   | 控制台注册商栏显示“帝思普” | `CLAIMED` |
| 自动续费 | 已开启                     | `CLAIMED` |
| 到期时间 | 2027-06-10                 | `CLAIMED` |

持有人信息不属于系统架构事实，不在本文记录。

### 解析记录分组

当前 DNSPod 控制台记录共 8 条，TTL 均显示为 600 秒：

| 记录          | 当前用途              | 状态         |
| ------------- | --------------------- | ------------ |
| `@`           | Vercel Realm apex     | 启用         |
| `www`         | Vercel Realm 主站别名 | 启用         |
| `cdn`         | EdgeOne CNAME         | 启用         |
| `ctrl`        | Vercel Admin          | 启用         |
| `lab`         | 相邻独立实验项目      | 暂停         |
| `docs`        | 过时文档项目          | 暂停         |
| `quiz`        | 临时活动站            | 暂停         |
| `openai-auth` | 域名验证 TXT          | 启用；值省略 |

`cdn` 记录的备注明确写着由 EO 修改以提供安全加速服务。`private-cdn` CNAME 和 `_dnsauth.private-cdn` 证书校验 TXT 已删除；DNSPod 删除成功提示说明记录变更会实时同步到 DNS 服务器，但各地缓存可能需要最多 24—48 小时刷新。Vercel CLI 当前只列出 `arsvine-realm`、`arsvine-admin` 和临时 `anti-fraud-quiz`；`docs`、`lab`、`quiz` 记录仍在 DNSPod 中但已暂停。控制台暂停状态、DNS 缓存和 Vercel 项目存在状态是三个不同事实，迁移或清理时必须分别核对。

## COS 存储桶

### 桶级概览

| 逻辑用途     | 地域               | 控制台容量                                  | 顶层可见命名空间    | ACL      | 当前入口                       |
| ------------ | ------------------ | ------------------------------------------- | ------------------- | -------- | ------------------------------ |
| 公共媒体     | 香港 `ap-hongkong` | 约 171 MB                                   | `realm/`、`shared/` | 私有读写 | EdgeOne 公共域名               |
| 私有 Catalog | 香港 `ap-hongkong` | 约 241.51 KB、58 个对象，存在 `realm/` 前缀 | `realm/`            | 私有读写 | Realm 服务端；自定义域名已移除 |

“公共媒体”是业务用途名称，不表示 COS 匿名公共读。公共桶的桶策略只允许 EdgeOne 云服务执行 `HeadObject`、`OptionsObject`、`GetObject`；浏览器的公共访问路径由 EdgeOne 代为回源。

私有 Catalog 桶没有额外的 bucket policy 行，Realm CAM 子账号有针对 Catalog 对象的读、写、删、Head 权限，同时还挂有较宽的全局腾讯云/COS 策略。该权限面应作为后续最小权限审查项处理，本次不改动。

### 跨域与防盗链

两只桶的 CORS 页面原先都观察到同一条规则：

- Origin：`https://arsvine.com`、`https://*.arsvine.com`、`http://dev.arsvine.com`、`https://*.vercel.app`；
- Methods：`GET`、`HEAD`；
- Allow-Headers：`*`；
- Expose-Headers：`ETag`、`Content-Length`、`x-cos-request-id`；
- Max-Age：`86400`；
- Vary：开启。

Realm 的 `SiteAssetsProvider` 只从公共 CDN 获取站点 Catalog；私有 Catalog 由 `src/features/assets/server/catalog/catalog-provider.ts` 服务端读取。公共媒体桶的开发域名、Vercel Preview 和 beta 测试有实际来源，因此保留公共桶 CORS；私有 Catalog 桶的浏览器 CORS 属于冗余配置，已移除，不影响服务端 COS SDK 读取。两只桶的 Referer 防盗链原均为开启的白名单模式：空 Referer 拒绝，白名单为 `arsvine.com` 与 `*.arsvine.com`。EdgeOne 字体规则还会设置浏览器侧的 `Access-Control-Allow-Origin: *`、允许方法和 86400 秒缓存头，因此迁移边缘层时不能只复制 COS CORS。

### 版本、容灾与运维开关

| 能力             | 公共媒体桶   | 私有 Catalog 桶 |
| ---------------- | ------------ | --------------- |
| 多 AZ            | 未开启       | 已开启          |
| COS 对象版本控制 | 未开启       | 未开启          |
| 跨地域桶复制     | 无规则       | 无规则          |
| 服务端加密       | 关闭         | 关闭            |
| 日志存储         | 关闭         | 关闭            |
| 生命周期         | 控制台表为空 | 本次未单独核验  |
| COS 全球加速     | 已关闭       | 关闭            |

公共桶没有生命周期规则，旧的 immutable 对象不会由该页面自动清理。当前资产回滚语义来自 hash object path、版本化 Catalog 和 pointer-last 发布流程，不来自 COS 版本控制。

公共桶和私有桶的 COS 盗刷风险检测都提示未配置外网下行流量告警；但腾讯云可观测平台已有一条启用的 COS 预设策略，覆盖全部对象并包含“外网下行流量 > 2000 MB（5 分钟、连续 1 点、每小时通知）”，当前有 1 个接收人。本轮未重复创建告警；检测器与告警策略页面的判断差异保留为后续覆盖范围核对项。检测还提示传统 CDN 接口未开通，后一项与实际使用 EdgeOne 并不冲突。

## EdgeOne 边缘站点

### 站点与域名

EdgeOne 服务总览显示：

- 站点：`arsvine.com`，已启用；
- 接入方式：DNSPod 托管接入；
- 加速区域：全球可用区，不含中国大陆；
- 套餐：个人版；
- 加速域名：只有 `cdn.arsvine.com`，状态已生效；
- 源站类型：对象存储，指向公共媒体 COS；
- HTTPS：已部署；
- 域名扩展服务：标准防护和 IPv6。

站点没有建立 EdgeOne 源站组，`cdn` 使用直接 COS 源站配置。EdgeOne 源站防护页面仍是欢迎/立即使用状态，说明当前没有配置“只允许 EdgeOne 回源 IP”的额外源站防火墙流程。

### 全局加速配置

站点全局配置页面观察到的关键值：

- 智能加速关闭；
- 节点缓存 TTL 遵循源站 `Cache-Control`，缺少该头时使用默认缓存策略；浏览器缓存 TTL 遵循源站 `Cache-Control`；
- 查询字符串全部保留，忽略大小写关闭；缓存预刷新和离线缓存关闭；
- Gzip 与 Brotli 全局开启；
- 强制 HTTPS 开启，重定向方式为 302；
- HTTP/2 回源开启，客户端 HTTP/2 开启，HTTP/3 关闭；
- HSTS 显示缓存 7 天，包含子域名和预加载均关闭；
- TLS 版本为 TLS 1.2、TLS 1.3，密码套件为 `eo-loose-v2023`；
- IPv6 访问开启，WebSocket、客户端 IP/地理位置自定义头和 gRPC 关闭；
- 最大上传大小为 128 MB；
- 自助调试关闭。

### 规则引擎

当前有 2 条已启用的规则，新增规则从上到下执行，较下方规则优先级更高：

1. `cdn.arsvine.com` 媒体资源缓存策略：图片/字体浏览器 7 天、节点 30 天；音频浏览器 7 天、节点 30 天；视频浏览器 1 天、节点 30 天；强制缓存关闭。
2. `cdn.arsvine.com` 字体资源缓存策略：`woff2`、`woff`、`ttf`、`otf`、`eot` 浏览器 7 天、节点 30 天；强制缓存关闭；同时设置字体请求的 CORS 响应头。

两条规则都保留查询字符串并关闭忽略大小写。迁移时应把这些规则视为资产发布协议的一部分，而不是可随意丢弃的 CDN 优化项。

### 安全与日志

当前域名使用站点级 Web 防护策略，没有独立的域名级策略、例外规则或自定义访问规则。已观察到：

- 自适应频控开启，等级为自适应/宽松，处置方式为 JavaScript challenge；
- 流量防盗刷开关开启，但该能力页面注明仅适用中国大陆地区；
- AI 爬虫处置开启，处置方式为 JavaScript challenge；
- 托管规则开启，评估模式已关闭；免费漏洞防护规则集显示 15/15，规则等级严格；
- 请求正文检测长度为 10 KB，超长正文只检测限制内数据；
- 客户端认证需要企业版，当前个人版不可用；
- 没有实时日志推送任务，离线日志功能未开通。

EdgeOne 服务总览在核验时显示站点已防护；这些安全配置属于供应商控制面快照，不能替代带真实流量的安全测试。

## SSL 证书台账

此前腾讯云 SSL 证书列表显示 4 条与本系统相关的证书记录。用户已确认手动删除了 `cdn.arsvine.com` 那张已过期且未关联资源的旧证书；本次工具未重新读取删除后的完整证书列表。

| 域名                      | 观察到的状态                                         | 到期时间   | 关联情况                        |
| ------------------------- | ---------------------------------------------------- | ---------- | ------------------------------- |
| `cdn.arsvine.com`         | 已签发，TrustAsia C1 DV Free，RSA；当前 EdgeOne 使用 | 2026-11-07 | EdgeOne 已启动，绑定当前证书    |
| `private-cdn.arsvine.com` | 已签发，原 COS 自定义源站证书，现未绑定              | 2026-12-05 | 域名和 COS 绑定已移除，证书保留 |
| `private-cdn.arsvine.com` | 旧的已签发证书，未绑定                               | 2026-10-06 | 证书保留，清理待单独确认        |

此前自动续费证书曾绑定到 `private-cdn` COS 自定义源站并显示“已开启/上线”；本轮已先解绑证书，再删除 COS 自定义域名。证书本身未删除。原 `cdn.arsvine.com` 已过期、未关联旧证书已由用户手动删除；原私有域名两张证书目前均未绑定，是否清理要单独确认。

## 迁移与运维关注项

1. 保留 DNSPod 的完整 zone、TTL、验证 TXT 的用途和证书绑定关系；迁移时分别切换注册商、DNS、证书和边缘域名。
2. 保留 COS 私有 ACL、EdgeOne 回源授权、CORS、Referer、缓存规则和字体响应头；不能用“公开读桶”替代当前安全边界。
3. 归档 COS 原始媒体、Catalog metadata、所有 immutable 版本和 pointer；COS 当前没有版本控制或复制作为恢复保险。
4. COS 盗刷检测与可观测平台现有预设告警的结果不一致；先核对该“全部对象”策略是否被检测器识别，再决定是否需要按桶补充告警，避免重复通知。
5. 收敛 `realm` CAM 子账号的全局权限，保留发布脚本需要的最小对象读写权限；这是独立的权限变更任务。
6. 证书台账必须结合实际域名绑定核对，不能只看 SSL 列表中的“已签发”；当前 `private-cdn` 两张证书已保留但未绑定，相关校验 TXT 已删除。
