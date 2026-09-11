import type { CopyableToken, Project } from '@/shared/types';
import { portfolioSourceFields } from '@/features/assets/contracts/source-manifest';

export const webProjects: Project[] = [
  {
    ...portfolioSourceFields('arsvine-realm'),
    title: 'Arsvine Realm',
    description:
      'A Next.js personal site built around portfolio work, writing, and a growing personal archive.',
    role: 'Design / Development / Content Architecture',
    year: '2026',
    status: 'shipped',
    highlights: [
      'Sci-fi HUD direction with dense information design',
      'More than 42 animation and interaction patterns',
      'Deep redevelopment based on the RainMorime template',
      'Multilingual content and category structure',
      'CDN image helpers and copyable information tokens',
    ],
    link: '#',
    liveUrl: '',
    articleContent: `Arsvine Realm is this site. It is not just a portfolio page, but a gradually forming personal archive system: projects, essays, interests, travel notes, art references, and still-evolving fictional settings are all gathered into the same interface order. Technically, it is built with Next.js, deployed on Vercel, and maintained through a lightweight content structure for multilingual pages, image resources, and detail articles.

The project started as a redevelopment of the RainMorime portfolio template, but has since grown through many custom modifications. Visually, I wanted it to carry the cool precision of a sci-fi HUD while also borrowing the kind of dense-but-controlled information design often seen in Hypergryph's interfaces. Lines, cards, motion, tags, and empty space all serve the same purpose: making the site feel like an expandable archive terminal.

On the engineering side, the project does not try to be complicated for its own sake. It focuses more on maintainability. Image URLs are generated through CDN helper functions, copyable information points inside article text are detected through copyableTokens, and project, experience, and interest content are split into independent data files. In this way, the site can work both as a public showcase and as an entrance to a personal knowledge and creation system.

For me, Arsvine Realm is not merely about putting things online. It is closer to a long-term base: a place to record what I am building, what I believe in, how I design systems, and how scattered ideas can be turned into visible structure.`,
  },
  {
    ...portfolioSourceFields('endfield-planner'),
    title: 'Endfield Gacha Simulator & Planner',
    description:
      'A pull simulation and resource planning tool for Arknights: Endfield, designed to turn player intuition into computable strategy.',
    role: 'Full Stack Developer / System Designer',
    year: '2026',
    status: 'wip',
    highlights: [
      'Separate simulation and planning workflows',
      'Strategy scoring based on Monte Carlo simulation',
      'Support for past, current, and future banner setups',
      'Responsive layout with dark mode support',
      'Planned data visualisation and import features',
    ],
    link: '#',
    liveUrl: '',
    articleContent: `This is a gacha simulation and planning tool prepared for Arknights: Endfield. Its core goal is not to simply recreate the entertainment loop of "single pull, ten-pull, and success animation", but to help players answer a more practical question: when resources are limited, goals differ, and banners keep rotating, which pulling strategy is closer to their own optimum?

The project is divided into two main pages. The simulator page recreates the banner pulling process and supports past, current, and possible future banner configurations. The planner page focuses more on strategy analysis. Players can enter their resources, target characters, expected savings, and other conditions; the system then uses Monte Carlo simulation to estimate the risk and expected value of different plans, producing a score and recommendation.

The backend is built with Python Flask, with Waitress used as the production server. It handles banner data, probability calculation, and planning logic. The frontend uses vanilla JavaScript and HTML to implement the interactive interface, with attention to responsive layout, dark mode, and a low-dependency structure. Rather than trying to become a complex platform immediately, the project first aims to make the core loop calculable, explainable, and iteratable.

The project is still in progress, and https://endfield.arsvine.com is a reserved address for now. Later, I plan to add richer data visualisation, user data import, plan comparison, and banner version management. At its core, this is also a system design exercise: breaking the uncertainty of a game into data, probability, weights, and decisions, then making those decisions understandable to the player.`,
  },
];

export const gameProjects: Project[] = [];

export const earlyProjects: Project[] = [
  {
    ...portfolioSourceFields('early-projects'),
    title: 'Early Projects',
    description:
      'Experiments, unfinished pieces, and remnants from the learning years. They are not all mature, but they form the earliest technical trail.',
    role: 'Student / Explorer',
    year: '201x',
    status: 'archived',
    link: '#',
    articleContent: `My early projects are difficult to organize completely now. Some were course assignments, some were spontaneous web pages, some were game prototypes, scripts, or small utilities, and some only survive as screenshots or forgotten filenames. Looking back, they were rough, and many of them could hardly be called "engineering". But those unstable attempts gradually pushed me toward programming, game design, and system building.

These projects touched HTML, CSS, JavaScript, Python, C++, C#, Scratch, and Unity. At that stage I was mostly exploring basic questions: how a button responds, how a piece of logic runs, how an interface becomes less ugly, and how a game mechanic can move from an idea into something playable.

I keep them archived here not to prove that the past was impressive, but to preserve a trail. Many preferences that now seem clear actually came from those messy early experiments.`,
  },
];

export const copyableTokens: CopyableToken[] = [
  { pattern: 'arsvine.com', label: 'Main site URL' },
  { pattern: 'www.arsvine.com', label: 'Main site WWW URL' },
  { pattern: 'https://endfield.arsvine.com', label: 'Endfield planner URL, not live yet' },
  { pattern: '2162371684', label: 'QQ account number' },
  { pattern: 'Details', label: 'View details' },
];
