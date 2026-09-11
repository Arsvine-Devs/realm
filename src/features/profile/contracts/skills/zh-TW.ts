import type { Skill, SkillCategory } from '@/shared/types';

export const skillCategories: SkillCategory[] = [
  {
    id: 'frontend',
    name: 'FRONTEND',
    skills: [
      {
        id: 'react',
        name: 'React / Next.js',
        level: 4,
        relatedProjects: [],
        description: '在既有結構之上修復並再開發這個 Portfolio 專案。',
      },
      {
        id: 'js-ts',
        name: 'JavaScript / TypeScript',
        level: 4,
        relatedProjects: [],
        description: 'Web 開發的主要語言。',
      },
      {
        id: 'html-css',
        name: 'HTML / CSS / SCSS',
        level: 3,
        relatedProjects: [],
        description: '響應式版面與自訂動畫。',
      },
    ],
  },
  {
    id: 'backend',
    name: 'BACKEND',
    skills: [
      {
        id: 'python',
        name: 'Python',
        level: 6,
        relatedProjects: [],
        description: '腳本、後端、資料分析、機器學習、AI 編排。',
      },
      {
        id: 'node',
        name: 'Node.js',
        level: 3,
        relatedProjects: [],
        description: '伺服器端 API 與工具鏈。',
      },
      {
        id: 'database',
        name: 'Database',
        level: 3,
        relatedProjects: [],
        description: 'SQL 與 NoSQL 基礎。',
      },
      {
        id: 'cplusplus',
        name: 'C++',
        level: 4,
        relatedProjects: [],
        description: '系統程式設計與效能優化。',
      },
      { id: 'csharp', name: 'C#', level: 4, relatedProjects: [], description: 'Unity 遊戲開發。' },
    ],
  },
  {
    id: 'general',
    name: 'GENERAL',
    skills: [
      {
        id: 'uiux',
        name: 'UI/UX Design',
        level: 6,
        relatedProjects: [],
        description: '介面設計與使用者體驗。',
      },
      {
        id: 'devops',
        name: 'DevOps',
        level: 3,
        relatedProjects: [],
        description: '雲端部署與 CI/CD。',
      },
      {
        id: 'git',
        name: 'Git / GitHub',
        level: 4,
        relatedProjects: [],
        description: '版本控制與協作。',
      },
    ],
  },
];

export const skillsData: Skill[] = skillCategories.flatMap((cat) => cat.skills);
