# 安全政策

本文说明如何报告 ARSVINE REALM 当前代码和生产站点中的安全问题。

Realm 是个人作品集、博客和内容展示系统。账户、OIDC、Passkey、TOTP 和 Content authoring 由相邻的 Platform 服务拥有；Realm 自己的 Route Handler 只负责站点内部的数据读取、protected post grant 和服务间刷新接口。

## 支持范围

安全报告适用于当前生产版本和默认分支 `master` 的最新代码。由本仓库代码或配置造成的 Preview 问题有限纳入；已归档分支、旧实验分支和第三方平台自身漏洞不属于支持范围。

## 应报告的问题

- secret、token、私有 URL 或环境凭据泄露；
- protected post、草稿或管理数据的越权读取；
- XSS、注入或不安全渲染；
- 不安全的 redirect、header、cache 或部署配置；
- 对本项目具有实际影响的依赖漏洞；
- 影响站点完整性、访客安全或私有维护流程的其他问题。

## 不属于范围的问题

- 没有实际影响的通用依赖告警或扫描器输出；
- 社会工程、钓鱼模拟和拒绝服务测试；
- 对 GitHub、Vercel、腾讯云、EdgeOne、DNSPod 或 analytics provider 的攻击；
- 需要物理访问维护者设备的问题；
- 不造成实际安全影响的浏览器提示。

## 报告方式

不要通过公开 issue、讨论、pull request 或社交媒体披露漏洞。优先使用 GitHub private vulnerability reporting 或 Security Advisory，并提供：

```text
摘要：问题的简短说明。
影响范围：页面、route、组件、配置、依赖或部署行为。
复现步骤：验证问题所需的最小步骤。
影响：攻击者或未授权用户可以做什么。
证据：截图、日志、请求示例或最小 proof of concept。
建议修复：可选，仅在有明确建议时提供。
```

如果没有私密报告入口，只创建标题为 `Security contact request` 的公开 issue，不要在其中写技术细节。

## 善意测试

欢迎范围有限、负责任且不会伤害服务或用户的安全研究。不要进行拒绝服务、高流量扫描、私有内容访问/外传、站点内容或仓库数据修改、持久化尝试或在修复前公开披露。

## Secret 处理

发现泄露的 token、凭据、私有 URL 或环境变量时，请私下报告，不要尝试使用。泄露的 secret 可能被轮换、撤销或删除；删除仓库变量不等于撤销供应商侧凭据。

这是个人项目，目前没有付费 bug bounty。漏洞修复后是否公开披露由维护者根据风险和协调情况决定。
