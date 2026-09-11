import type { CopyableToken, Project } from '@/shared/types';
import type { Locale } from '@/shared/contracts/locale';
import {
  findSourceItem,
  galleryReferences,
  legacyAssetReference,
  sourceManifests,
} from '@/features/assets/contracts/source-manifest';

const realmSource = findSourceItem(sourceManifests.portfolio, 'arsvine-realm');
const plannerSource = findSourceItem(sourceManifests.portfolio, 'endfield-planner');
const earlySource = findSourceItem(sourceManifests.portfolio, 'early-projects');

// ============================================================
// Web / Frontend Projects
// ============================================================
export const webProjects: Project[] = [
  {
    id: realmSource.runtimeId,
    title: realmSource.title,
    description: '一个以个人档案、作品展示与写作入口为核心的 Next.js 个人站。',
    role: 'Design / Development / Content Architecture',
    year: '2026',
    status: 'shipped',
    tech: realmSource.tech,
    highlights: [
      '科幻 HUD 与鹰角式信息密度',
      '超 42 种动画与交互动效',
      '基于 RainMorime 模板深度再开发',
      '多语言内容与分类结构',
      '图片 CDN 封装与可复制信息点',
    ],
    link: '#',
    liveUrl: '',
    imageUrl: legacyAssetReference(realmSource.cover),
    galleryImages: galleryReferences(realmSource.gallery),
    articleContent: `Arsvine Realm，即本站。它不是单纯的作品集页面，而是一个逐渐成型的个人档案系统：项目、文章、兴趣、旅行、艺术与一些还在发酵的设定，都被收束到同一个界面秩序里。技术上使用 Next.js 构建，部署在 Vercel 上，并通过一套相对轻量的内容结构维护多语言页面、图片资源与详情页正文。

这个项目最开始基于 RainMorime 个人作品集模板再开发，但后续已经加入了大量自定义修改。视觉方向上，我希望它有一点科幻 HUD 的冷峻感，也有鹰角式界面那种“信息很多，但不是乱堆”的秩序感：线条、卡片、动效、标签和留白都服务于同一个目标——让页面像一个可以继续扩展的档案终端。

工程上，它并不追求复杂到炫技，而是更重视可维护性。图片地址通过 CDN 工具函数统一生成，正文中可复制的信息点通过 copyableTokens 识别，项目、经历与兴趣内容也拆分为独立数据文件。这样一来，网站既能作为展示页，也能慢慢变成一个个人知识与创作系统的入口。

对我来说，Arsvine Realm 的意义不只是“把东西放到网上”。它更像是一个长期基地：记录我正在做什么、相信什么、怎样设计系统，以及怎样把一些零散的灵感变成可见的结构。`,
  },
  {
    id: plannerSource.runtimeId,
    title: plannerSource.title,
    description:
      '面向《明日方舟：终末地》的抽卡模拟与资源规划工具，尝试把玩家直觉转化为可计算的策略。',
    role: 'Full Stack Developer / System Designer',
    year: '2026',
    status: 'wip',
    tech: plannerSource.tech,
    highlights: [
      '卡池模拟与资源规划分离',
      '基于蒙特卡洛模拟给出策略评分',
      '支持往期、当期与未来卡池配置',
      '响应式页面与深色模式',
      '后续计划加入数据可视化与导入能力',
    ],
    link: '#',
    liveUrl: '',
    imageUrl: legacyAssetReference(plannerSource.cover),
    galleryImages: galleryReferences(plannerSource.gallery),
    articleContent: `这是一个为《明日方舟：终末地》准备的卡池模拟与规划工具。它的核心目标不是简单复刻“抽一次、十连、出货”的娱乐模拟，而是帮助玩家回答一个更实际的问题：在资源有限、目标不同、卡池不断轮换的情况下，怎样抽才更接近自己的最优策略？

项目分为两个主要页面。模拟器页面负责还原卡池抽取过程，支持配置往期、当期以及未来可能出现的卡池；规划器页面则更偏策略分析，玩家可以输入资源、目标角色、期望保留量等条件，系统通过蒙特卡洛模拟估算不同方案的风险与收益，并给出评分和建议。

后端使用 Python Flask 构建 API，Waitress 作为生产服务器，负责处理卡池数据、概率计算与规划逻辑。前端使用原生 JavaScript 和 HTML 实现交互界面，重点保证响应式布局、深色模式和低依赖结构。这个项目并不追求一开始就做成复杂平台，而是先把“可计算、可解释、可迭代”的核心链路跑通。

目前项目仍在开发中，https://endfield.arsvine.com 是预留地址。后续我计划补充更完整的数据可视化、用户数据导入、方案对比和卡池版本管理。它本质上也是一次系统设计练习：把游戏里的不确定性拆成数据、概率、权重和决策，再让玩家看懂自己的选择。`,
  },
];

// ============================================================
// Game / Creative Projects
// ============================================================
export const gameProjects: Project[] = [];

// ============================================================
// Early / Learning Projects
// ============================================================
export const earlyProjects: Project[] = [
  {
    id: earlySource.runtimeId,
    title: earlySource.title,
    description: '学习过程中留下的各种实验、半成品和遗产。它们不一定成熟，但构成了最早的技术轨迹。',
    role: 'Student / Explorer',
    year: '201x',
    status: 'archived',
    tech: earlySource.tech,
    link: '#',
    imageUrl: legacyAssetReference(earlySource.cover),
    galleryImages: galleryReferences(earlySource.gallery),
    articleContent: `早期项目已经很难完整整理了。它们有的是课程作业，有的是一时兴起的网页，有的是游戏原型、脚本、小工具，也有一些只留下截图或文件名的半成品。现在回头看，它们当然粗糙，甚至很多地方称不上“工程”，但正是这些不稳定的尝试，把我一步步推向了编程、游戏设计和系统构建。

这些项目横跨 HTML、CSS、JavaScript、Python、C++、C#、Scratch 和 Unity。那时候更多是在摸索：一个按钮怎样响应，一段逻辑怎样跑起来，一个界面怎样不那么难看，一个游戏机制怎样从想法变成可操作的东西。

我把它们归档在这里，不是为了证明过去有多厉害，而是为了保留一条轨迹：很多现在看似清晰的偏好，其实都来自早期那些混乱的小实验。`,
  },
];

// ============================================================
// 详情页正文里需要被识别为"可复制"的关键词。
// 当 articleContent 文本中出现下列任何 pattern 字符串时，会被
// 自动渲染为"点击复制"按钮（保留 Markdown 链接 [text](url) 的
// 解析能力），无需手写额外 Markdown。
//
// 把你的服务器 IP / QQ 群号 / Discord 邀请码 / 邮箱别名等加在这里。
// 数组为空则只保留 Markdown 链接解析能力。
// ============================================================
export const copyableTokens: CopyableToken[] = [
  { pattern: 'arsvine.com', label: '主站地址' },
  { pattern: 'www.arsvine.com', label: '主站 WWW 地址' },
  { pattern: 'https://endfield.arsvine.com', label: '终末地规划器地址，暂未上线' },
  { pattern: '2162371684', label: '个人 QQ 号' },
  { pattern: 'Details', label: '查看详情' },
];

// 详情页 revalidation 路径注册表，供 /api/revalidate-assets 聚合调用
export function getAssetRevalidationPaths(locale: Locale): string[] {
  return [...webProjects, ...gameProjects, ...earlyProjects].map(
    (project) => `/${locale}/web/${project.id}`,
  );
}
