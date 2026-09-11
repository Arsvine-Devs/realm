import type { ExperienceItem } from '@/shared/types';
import {
  findSourceItem,
  galleryReferences,
  sourceManifests,
} from '@/features/assets/contracts/source-manifest';

const highschoolSource = findSourceItem(sourceManifests.experience, 'highschool');
const universitySource = findSourceItem(sourceManifests.experience, 'university');
const rhodesSource = findSourceItem(sourceManifests.experience, 'rhodes-island');

// ============================================================
// Timeline
// ============================================================
export const experienceData: ExperienceItem[] = [
  {
    id: highschoolSource.id,
    type: highschoolSource.type,
    duration: '2019 - 2025',
    title: highschoolSource.title,
    location: highschoolSource.location,
    details: [
      '在这里完成了高中阶段的主要学习，也逐渐确定了对编程、设计、游戏与架空写作的长期兴趣。',
      '那段时间更像一段基础设施建设：知识、习惯、审美与自学能力，都在缓慢成形。',
    ],
    alignment: 'right',
    galleryImages: galleryReferences(highschoolSource.gallery),
  },
  {
    id: universitySource.id,
    type: universitySource.type,
    duration: '2025 - 至今',
    title: universitySource.title,
    location: universitySource.location,
    details: [
      '计算机科学与技术专业在读，继续把课程学习、工程实践和个人兴趣并行推进。',
      '课外主要折腾个人网站、AI 工作流、IM 拟人系统、游戏开发与一些审美实验。',
      '镇江是暂居地，也是很多记录开始沉淀成 Arsvine Realm 的地方。',
    ],
    alignment: 'left',
    galleryImages: galleryReferences(universitySource.gallery),
  },
  {
    id: rhodesSource.id,
    type: rhodesSource.type,
    duration: '长期在舰',
    title: rhodesSource.title,
    location: rhodesSource.location,
    details: [
      '虚构经历：罗德岛制药来自《明日方舟》，并非真实实习或工作经历。',
      '作为长期玩家与博士，日常内容包括战术部署、资源规划、活动研究，以及在卫戍协议里反复加班。',
      '它更像一个精神坐标：在混乱世界中维持秩序、理想和一点不服输的工程精神。',
    ],
    alignment: 'left',
    galleryImages: galleryReferences(rhodesSource.gallery),
  },
];
