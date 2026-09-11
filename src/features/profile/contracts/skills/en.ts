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
        description:
          'Repaired and iterated on this portfolio project on top of an existing structure.',
      },
      {
        id: 'js-ts',
        name: 'JavaScript / TypeScript',
        level: 4,
        relatedProjects: [],
        description: 'Primary languages for web development.',
      },
      {
        id: 'html-css',
        name: 'HTML / CSS / SCSS',
        level: 3,
        relatedProjects: [],
        description: 'Responsive layouts and custom animations.',
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
        description:
          'Scripting, backend work, data analysis, machine learning, and AI orchestration.',
      },
      {
        id: 'node',
        name: 'Node.js',
        level: 3,
        relatedProjects: [],
        description: 'Server-side APIs and tooling.',
      },
      {
        id: 'database',
        name: 'Database',
        level: 3,
        relatedProjects: [],
        description: 'SQL and NoSQL fundamentals.',
      },
      {
        id: 'cplusplus',
        name: 'C++',
        level: 4,
        relatedProjects: [],
        description: 'Systems programming and performance optimization.',
      },
      {
        id: 'csharp',
        name: 'C#',
        level: 4,
        relatedProjects: [],
        description: 'Unity game development.',
      },
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
        description: 'Interface design and user experience.',
      },
      {
        id: 'devops',
        name: 'DevOps',
        level: 3,
        relatedProjects: [],
        description: 'Cloud deployment and CI/CD.',
      },
      {
        id: 'git',
        name: 'Git / GitHub',
        level: 4,
        relatedProjects: [],
        description: 'Version control and collaboration.',
      },
    ],
  },
];

export const skillsData: Skill[] = skillCategories.flatMap((cat) => cat.skills);
