import { BILIBILI_FRIENDLY_COUNTRIES, HIDE_X_COUNTRIES } from './region-visibility';
import { PERFORMANCE_CAPABILITIES, PERFORMANCE_CAPABILITY_ATTRIBUTES } from './performance-tiers';
import { resolveInitialPerformancePolicy } from './performance-policy';
import { htmlLangMap } from '@/shared/contracts/locale';

export const POWER_SYSTEM_STORAGE_KEY = 'arsvine:power-system';
export const THEME_MODE_STORAGE_KEY = 'arsvine:theme-mode';

function buildPerformanceTierBootstrap() {
  const capabilitiesByTier = JSON.stringify(PERFORMANCE_CAPABILITIES);
  const capabilityAttributes = JSON.stringify(PERFORMANCE_CAPABILITY_ATTRIBUTES);
  const initialPolicyResolver = resolveInitialPerformancePolicy.toString();
  return `(() => {
    try {
      const html = document.documentElement;
      const reduceMotion = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const resolveInitialPerformancePolicy = ${initialPolicyResolver};
      const initialPolicy = resolveInitialPerformancePolicy({
        reducedMotion: reduceMotion,
        saveData: Boolean(connection && connection.saveData),
      });
      const tier = initialPolicy.tier;
      const capabilities = ${capabilitiesByTier}[tier];
      const capabilityAttributes = ${capabilityAttributes};

      html.setAttribute('data-performance-tier', tier);
      html.setAttribute('data-performance-reason', initialPolicy.reason || 'none');
      for (const [capability, attribute] of Object.entries(capabilityAttributes)) {
        html.setAttribute(attribute, capabilities[capability] ? 'on' : 'off');
      }
    } catch (error) {
      console.error('[document-bootstrap] failed to resolve performance tier', error);
    }
  })();`;
}

/**
 * 同步内联脚本 —— 在 hydration / CSS 应用之前跑：
 *   1. 从 sessionStorage / localStorage 恢复 power-system 与 theme-mode（避免反转模式闪烁）；
 *   2. 读取浏览器性能信号，写到 <html data-performance-tier>，让首屏 CSS 先拿到降级档位；
 *   3. 从 GEO_COUNTRY cookie 读 country，写到 <html data-country / data-x-blocked / data-bilibili-blocked>。
 *
 * 这是 SSR 不再注入 country 后的唯一来源，目的是消除 SSG/ISR 产物被 CDN 共享缓存
 * 时的 country 污染（不同地区访客拿到同一份静态产物）。脚本是同步执行，CSS 命中前完成，
 * 不会出现"先显示再隐藏"的首屏闪烁。
 *
 * 集合常量（HIDE_X_COUNTRIES / BILIBILI_FRIENDLY_COUNTRIES）从 region-visibility 模块导出，
 * 单一真相；这里序列化进 inline script。
 */
export function buildDocumentBootstrapScript() {
  const xBlockedCountries = JSON.stringify(Array.from(HIDE_X_COUNTRIES));
  const bilibiliFriendlyCountries = JSON.stringify(Array.from(BILIBILI_FRIENDLY_COUNTRIES));
  const documentLanguages = JSON.stringify(htmlLangMap);

  return `(() => {
    try {
      const html = document.documentElement;
      const locale = (document.location?.pathname || '').split('/').filter(Boolean)[0] || '';
      const documentLanguages = ${documentLanguages};
      if (documentLanguages[locale]) {
        html.lang = documentLanguages[locale];
      }
      const powerRaw = sessionStorage.getItem('${POWER_SYSTEM_STORAGE_KEY}') || localStorage.getItem('${POWER_SYSTEM_STORAGE_KEY}');
      if (powerRaw) {
        const power = JSON.parse(powerRaw);
        if (power && power.powerLevel === 100 && power.isDischarging === false) {
          html.setAttribute('data-theme-mode', 'inverted');
        } else if (html.getAttribute('data-theme-mode') === 'inverted') {
          html.setAttribute('data-theme-mode', 'default');
        }
      }

      const themeMode = sessionStorage.getItem('${THEME_MODE_STORAGE_KEY}') || localStorage.getItem('${THEME_MODE_STORAGE_KEY}');
      if (themeMode === 'inverted') {
        html.setAttribute('data-theme-mode', 'inverted');
      } else if (themeMode === 'default' && html.getAttribute('data-theme-mode') === 'inverted') {
        html.setAttribute('data-theme-mode', 'default');
      }

      ${buildPerformanceTierBootstrap()}

      const match = document.cookie.match(/(?:^|;\\s*)GEO_COUNTRY=([^;]+)/);
      const country = match ? decodeURIComponent(match[1]).toUpperCase() : '';
      if (country) {
        html.setAttribute('data-country', country);
      } else {
        html.removeAttribute('data-country');
      }

      const xBlockedCountries = ${xBlockedCountries};
      const bilibiliFriendlyCountries = ${bilibiliFriendlyCountries};
      const xBlocked = country !== '' && xBlockedCountries.includes(country);
      const bilibiliBlocked = country !== '' && !bilibiliFriendlyCountries.includes(country);

      if (xBlocked) {
        html.setAttribute('data-x-blocked', 'true');
      } else {
        html.removeAttribute('data-x-blocked');
      }

      if (bilibiliBlocked) {
        html.setAttribute('data-bilibili-blocked', 'true');
      } else {
        html.removeAttribute('data-bilibili-blocked');
      }
    } catch (error) {
      console.error('[document-bootstrap] failed to restore client state', error);
    }
  })();`;
}
