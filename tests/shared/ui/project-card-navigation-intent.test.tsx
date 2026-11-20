import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProjectCard from '@/shared/ui/ProjectCard';

const project = {
  id: 1,
  title: 'Intent Project',
  description: 'Navigation intent test',
  tech: [],
  imageUrl: '',
};

afterEach(cleanup);

describe('ProjectCard navigation intent', () => {
  it('renders ordinary and modified activations as a real link', () => {
    const onNavigateIntent = vi.fn();
    render(
      <ProjectCard
        project={project}
        href="/en/web/1"
        onNavigateIntent={onNavigateIntent}
        isInverted={false}
      />,
    );
    const card = screen.getByRole('link', { name: /Intent Project/ });
    expect(card.getAttribute('href')).toBe('/en/web/1');

    fireEvent.mouseEnter(card);
    fireEvent.focus(card);
    fireEvent.pointerDown(card, { button: 2 });
    fireEvent.pointerDown(card, { button: 0, ctrlKey: true });
    expect(onNavigateIntent).not.toHaveBeenCalled();

    fireEvent.pointerDown(card, { button: 0 });
    expect(onNavigateIntent).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onNavigateIntent).toHaveBeenCalledTimes(2);
  });

  it('uses a native button for an inline detail action', () => {
    const onClick = vi.fn();
    render(<ProjectCard project={project} onClick={onClick} isInverted={false} />);
    const card = screen.getByRole('button', { name: /Intent Project/ });
    expect(card.tagName).toBe('BUTTON');
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(project);
  });
});
