/**
 * 基于访客所在地的 UI 可见性策略。
 *
 * 仅供 UI 微调使用（隐藏访客所在地访问不到的外链图标），
 * 不参与权限/安全决策；未知 country 一律按"显示"处理。
 *
 * 数据流：
 *   1. proxy.ts 读 Vercel geolocation → 写 GEO_COUNTRY cookie
 *   2. 根布局的 bootstrap 脚本在 hydration 前读 cookie → `<html data-country data-x-blocked data-bilibili-blocked>`
 *   3. globals.scss 用 `html[data-x-blocked] [data-hide-when-x-blocked]` 等规则直接隐藏
 *   4. 语言展示与地区可见性分离：UI 若要显示语言代码，改走 useVisitorLanguageCode hook
 */

/**
 * 完全屏蔽 X（Twitter）的国家/地区集合。
 * 注意：HK / MO / TW 没有屏蔽，能正常访问 x.com。
 *
 * - CN：大陆全境屏蔽 x.com
 * - IR：伊朗，国家防火墙屏蔽
 * - KP：朝鲜，几乎所有外网均屏蔽
 * - TM：土库曼，国家防火墙屏蔽
 */
export const HIDE_X_COUNTRIES: ReadonlySet<string> = new Set(['CN', 'IR', 'KP', 'TM']);

/**
 * 能正常访问 Bilibili 的"大中华"地区集合。
 * 这之外的地区 B 站会有：
 *   - 视频版权区域限制（最常见）
 *   - 部分海外 IP 段限流 / 503
 *   - 注册流程需大陆手机号
 * 综合体验差，外链图标对海外访客几乎没意义。
 *
 * 不放进集合则视为"被屏蔽"，country 未知时由 document-bootstrap 按显示处理。
 */
export const BILIBILI_FRIENDLY_COUNTRIES: ReadonlySet<string> = new Set(['CN', 'HK', 'MO', 'TW']);
