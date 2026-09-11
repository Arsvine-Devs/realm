import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { prefetchMock, setBackOverrideMock } = vi.hoisted(() => ({
  prefetchMock: vi.fn<(href: string) => Promise<void>>(() => Promise.resolve()),
  setBackOverrideMock: vi.fn(),
}));

vi.mock('@/features/navigation/model/TransitionProvider', () => ({
  useTransition: () => ({ navigateTo: vi.fn(), setBackOverride: setBackOverrideMock }),
}));
vi.mock('@/features/navigation/model/LayoutAnchorsContext', () => ({
  useLayoutAnchors: () => ({ registerScrollContainer: vi.fn() }),
}));
vi.mock('@/features/navigation/model/NavigationRuntime', () => ({
  useNavigationRuntime: () => ({ prefetch: prefetchMock }),
}));
vi.mock('@/features/portfolio/ui/WorksSection', () => ({
  default: ({
    webProjects,
    gameProjects,
    handleWorkItemClick,
    handleWorkItemIntent,
  }: {
    webProjects: Array<{ id: number; title: string }>;
    gameProjects: Array<{ id: number; title: string }>;
    handleWorkItemClick: (item: unknown) => void;
    handleWorkItemIntent: (item: unknown) => void;
  }) => (
    <>
      <button onClick={() => handleWorkItemClick(gameProjects[0])}>open work</button>
      <button onPointerDown={() => handleWorkItemIntent(webProjects[0])}>prefetch web</button>
      <button onPointerDown={() => handleWorkItemIntent(gameProjects[0])}>
        prefetch inline game
      </button>
    </>
  ),
}));
vi.mock('@/features/experience/ui/ExperienceSection', () => ({ default: () => null }));
vi.mock('@/features/blog/ui/blog/BlogSection', () => ({
  default: ({
    posts,
    handleBlogItemIntent,
  }: {
    posts: Array<{ slug: string }>;
    handleBlogItemIntent: (post: unknown) => void;
  }) => (
    <>
      <button onPointerDown={() => handleBlogItemIntent(posts[0])}>prefetch public blog</button>
      <button onPointerDown={() => handleBlogItemIntent(posts[1])}>prefetch protected blog</button>
    </>
  ),
}));
vi.mock('@/features/life/ui/LifeSection', () => ({
  default: ({
    gameData,
    handleLifeItemIntent,
  }: {
    gameData: Array<{ id: string }>;
    handleLifeItemIntent: (item: unknown) => void;
  }) => <button onPointerDown={() => handleLifeItemIntent(gameData[0])}>prefetch life</button>,
}));
vi.mock('@/features/profile/ui/ContactSection', () => ({ default: () => null }));
vi.mock('@/features/profile/ui/AboutSection', () => ({ default: () => null }));
vi.mock('@/features/portfolio/ui/WorkDetailView', () => ({
  default: ({ item }: { item: { title: string } }) => <div>{item.title} detail</div>,
}));
vi.mock('@/features/experience/ui/ExperienceDetailView', () => ({ default: () => null }));
vi.mock('@/features/life/ui/LifeDetailView', () => ({ default: () => null }));

import ContentPage from '@/features/navigation/ui/ContentPage';
import { CONTENT_DETAIL_EXIT_DELAY_MS } from '@/shared/lib/ui-timings';
import type { Project } from '@/shared/types';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  cleanup();
  (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ContentPage detail closing', () => {
  it('unmounts a detail view when animationend never arrives', () => {
    vi.useFakeTimers();
    const gameProject: Project = {
      id: 1,
      title: 'Game One',
      description: 'Test project',
      tech: [],
      link: '',
      imageUrl: '',
      galleryImages: [],
    };
    const { container } = render(
      <ContentPage
        locale="en"
        messages={{}}
        blogPosts={[]}
        webProjects={[]}
        gameProjects={[gameProject]}
        earlyProjects={[]}
        experienceData={[]}
        gameData={[]}
        travelData={[]}
        otherData={[]}
        alsoPlayGames={[]}
        artPlaceholderText=""
        skillCategories={[]}
        pageDescription=""
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'open work' }));
    expect(screen.getByText('Game One detail')).toBeTruthy();

    const backButton = container.querySelector('button[class*="globalBackButton"]');
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton as HTMLButtonElement);
    act(() => vi.advanceTimersByTime(CONTENT_DETAIL_EXIT_DELAY_MS));

    expect(screen.queryByText('Game One detail')).toBeNull();
  });

  it('clears the back override when the detail page unmounts', () => {
    const { unmount } = render(
      <ContentPage
        locale="en"
        messages={{}}
        blogPosts={[]}
        webProjects={[]}
        gameProjects={[]}
        earlyProjects={[]}
        experienceData={[]}
        gameData={[]}
        travelData={[]}
        otherData={[]}
        alsoPlayGames={[]}
        artPlaceholderText=""
        skillCategories={[]}
        pageDescription=""
      />,
    );

    unmount();
    expect(setBackOverrideMock).toHaveBeenLastCalledWith(null);
  });

  it('prefetches only routed public content after navigation intent', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    const webProject: Project = {
      id: 2,
      title: 'Web Two',
      description: 'Test project',
      tech: [],
      link: '',
      imageUrl: '',
      galleryImages: [],
    };
    const gameProject: Project = {
      ...webProject,
      id: 3,
      title: 'Inline Game',
    };
    render(
      <ContentPage
        locale="en"
        messages={{}}
        blogPosts={[
          {
            slug: 'public-post',
            title: 'Public',
            date: '',
            excerpt: '',
            tags: [],
            readingMinutes: 1,
            access: { mode: 'public' },
          },
          {
            slug: 'protected-post',
            title: 'Protected',
            date: '',
            excerpt: '',
            tags: [],
            readingMinutes: 1,
            access: { mode: 'totp', group: 'test' },
          },
        ]}
        webProjects={[webProject]}
        gameProjects={[gameProject]}
        earlyProjects={[]}
        experienceData={[]}
        gameData={[
          {
            id: 'life-one',
            title: 'Life One',
            description: '',
            tech: [],
            imageUrl: '',
            galleryImages: [],
          },
        ]}
        travelData={[]}
        otherData={[]}
        alsoPlayGames={[]}
        artPlaceholderText=""
        skillCategories={[]}
        pageDescription=""
      />,
    );

    expect(prefetchMock).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'prefetch web' }), { button: 0 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'prefetch inline game' }), {
      button: 0,
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'prefetch life' }), { button: 0 });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'prefetch public blog' }), {
      button: 0,
    });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'prefetch protected blog' }), {
      button: 0,
    });

    expect(prefetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/en/web/2',
      '/en/life/life-one',
      '/en/blog/public-post?lang=en',
    ]);
  });
});
