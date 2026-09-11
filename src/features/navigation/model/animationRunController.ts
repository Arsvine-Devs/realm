export interface QueuedNavigation {
  url: string;
  options?: { scroll?: boolean };
}

function isAnimationCancellation(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export class AnimationRunController {
  private running = false;
  private queued: QueuedNavigation | null = null;
  private animation: Animation | null = null;
  private cleanups = new Set<() => void>();

  startOrQueue(navigation: QueuedNavigation) {
    if (this.running) {
      this.queued = navigation;
      return false;
    }

    this.cancelEffects();
    this.running = true;
    this.queued = null;
    return true;
  }

  setAnimation(animation: Animation | null) {
    this.animation?.cancel();
    this.animation = animation;
  }

  runAnimation(animation: Animation, onFinished: () => void, onFailed: (error: unknown) => void) {
    this.setAnimation(animation);
    void animation.finished.then(onFinished).catch((error) => {
      if (!isAnimationCancellation(error)) onFailed(error);
    });
  }

  addCleanup(cleanup: () => void) {
    this.cleanups.add(cleanup);
    return () => this.cleanups.delete(cleanup);
  }

  waitForTransition(element: HTMLElement, fallbackMs: number, onComplete: () => void) {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      onComplete();
    };
    const fallbackId = window.setTimeout(finish, fallbackMs);
    const cleanup = () => {
      element.removeEventListener('transitionend', finish);
      window.clearTimeout(fallbackId);
      this.cleanups.delete(cleanup);
    };
    element.addEventListener('transitionend', finish, { once: true });
    this.cleanups.add(cleanup);
  }

  complete() {
    this.animation = null;
    this.runCleanups();
    this.running = false;
    const queued = this.queued;
    this.queued = null;
    return queued;
  }

  cancel() {
    this.cancelEffects();
    this.running = false;
    this.queued = null;
  }

  isRunning() {
    return this.running;
  }

  private cancelEffects() {
    this.animation?.cancel();
    this.animation = null;
    this.runCleanups();
  }

  private runCleanups() {
    const cleanups = [...this.cleanups];
    this.cleanups.clear();
    for (const cleanup of cleanups) cleanup();
  }
}
