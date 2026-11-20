/**
 * Next.js <Image> 远程图床白名单。
 *
 * 新增第三方图床（CDN/对象存储/占位图服务）时，在此追加一条即可，
 * 无需触碰 next.config.js。每条配置遵循 Next.js images.remotePatterns 规范：
 *   { protocol, hostname, port, pathname }
 *
 * 默认放行：
 *   - images.unsplash.com / source.unsplash.com —— 模板示例图
 *   - placehold.co —— data/*.ts 占位图所用
 */
module.exports = [
  { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '/**' },
  { protocol: 'https', hostname: 'source.unsplash.com', port: '', pathname: '/**' },
  { protocol: 'https', hostname: 'placehold.co', port: '', pathname: '/**' },
];
