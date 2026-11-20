# 外部供应商与运行边界

[返回文档组](./README.md)

| 外部服务     | 职责                                                        |
| ------------ | ----------------------------------------------------------- |
| Cloudflare   | 权威 DNS、边缘 TLS、防护、Access 和到 Alice 的 Web Tunnel。 |
| 腾讯云       | 域名注册与续费。                                            |
| GitHub       | 代码、检查和部署制品。运行中的网站从本机读取数据。          |
| Better Stack | 独立的状态页和公网可用性观测。                              |
| Hitokoto     | Realm 的可选句子接口。上游不可用时应用使用内置内容。        |
| Google Fonts | 生成公开字体资产时的来源。浏览器使用平台 CDN 上的文件。     |

Alice 运行 Caddy、站点应用、PostgreSQL 和 Valkey。公共媒体由 Caddy 读取公开文件树，私有 Catalog 由 Realm 读取。服务依赖、权限与故障影响见 [Web 平台运维](https://github.com/Arsvine-Devs/platform/blob/main/ops/WEB.md)。
