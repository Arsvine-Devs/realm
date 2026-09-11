import {
  advanceArtifactLoad,
  buildTelemetryArtifactText,
  computeArtifactStage,
  createTelemetrySnapshot,
  decayArtifactLoad,
} from '@/features/hud/model/env-telemetry-artifact';
import type { EnvArtifactStage, EnvData } from '@/shared/contracts/environment';
import type { EnvParamsTypingState } from '@/features/hud/contracts/state';
import { hashStringFnv1a } from '@/shared/lib/hash';

const ENV_INITIAL_BOOT_DELAY = 1000;
const ENV_REFRESH_MIN_MS = 10000;
const ENV_REFRESH_JITTER_MS = 6000;
export const ENV_DWELL_INTERVAL_MS = 24000;
export const ENV_DECAY_INTERVAL_MS = 30000;
const ENV_IDLE_DECAY_THRESHOLD_MS = 45000;
const ENV_VISIBILITY_GAIN_THRESHOLD_MS = 15000;
const ENV_SCROLL_GAIN_COOLDOWN_MS = 20000;
const ENV_INITIAL_TYPE_DELAY_MS = 32;
const ENV_OVERWRITE_DELAY_MS = 18;
const ENV_OVERWRITE_BATCH_MIN = 2;
const ENV_OVERWRITE_BATCH_MAX = 4;

type ArtifactGainReason = Parameters<typeof advanceArtifactLoad>[1];
type PendingWork = 'none' | 'pulse' | 'refresh';

interface Scheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout> | undefined) => void;
}

export interface EnvTelemetryControllerDependencies {
  now: () => number;
  random: () => number;
  scheduler: Scheduler;
}

const INITIAL_SNAPSHOT: EnvParamsTypingState = {
  displayedEnvParams: '',
  isEnvParamsTyping: false,
  envData: null,
  envDataVersion: 0,
  envArtifactStage: 0,
};

function defaultDependencies(): EnvTelemetryControllerDependencies {
  return {
    now: Date.now,
    random: Math.random,
    scheduler: {
      setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
      clearTimeout: (id) => {
        if (id !== undefined) globalThis.clearTimeout(id);
      },
    },
  };
}

function hashDisplayedBuffer(value: string) {
  return hashStringFnv1a(value).toString(16);
}

export class EnvTelemetryController {
  private snapshot: EnvParamsTypingState = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private readonly dependencies: EnvTelemetryControllerDependencies;
  private active = false;
  private routeEnabled = true;
  private documentVisible = true;
  private initialized = false;
  private artifactLoad = 0;
  private lastArtifactGainAt = 0;
  private lastHiddenAt: number | null = null;
  private lastScrollGainAt = 0;
  private pendingWork: PendingWork = 'none';
  private telemetryVariant = 0;
  private pulseCounter = 0;
  private currentTemp = 55;
  private currentTelemetrySnapshot: ReturnType<typeof createTelemetrySnapshot> | null = null;
  private bootTimer: ReturnType<typeof setTimeout> | undefined;
  private refreshTimer: ReturnType<typeof setTimeout> | undefined;
  private animationTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(dependencies: Partial<EnvTelemetryControllerDependencies> = {}) {
    const defaults = defaultDependencies();
    this.dependencies = {
      now: dependencies.now ?? defaults.now,
      random: dependencies.random ?? defaults.random,
      scheduler: dependencies.scheduler ?? defaults.scheduler,
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  start() {
    if (this.active) return;
    this.active = true;
    this.ensureBooted();
  }

  stop() {
    this.active = false;
    this.clearTimers();
    this.initialized = false;
    this.artifactLoad = 0;
    this.lastArtifactGainAt = 0;
    this.lastHiddenAt = null;
    this.lastScrollGainAt = 0;
    this.pendingWork = 'none';
    this.telemetryVariant = 0;
    this.pulseCounter = 0;
    this.currentTelemetrySnapshot = null;
    this.snapshot = INITIAL_SNAPSHOT;
    this.emit();
  }

  setRouteEnabled(enabled: boolean) {
    this.routeEnabled = enabled;
    if (!enabled) {
      this.patchSnapshot({ isEnvParamsTyping: false });
      return;
    }
    this.resume();
  }

  routeChanged() {
    if (!this.active) return;
    this.noteArtifactGain('route');
    if (this.initialized && this.canRender()) this.runPulse(false);
  }

  visibilityChanged(hidden: boolean) {
    this.documentVisible = !hidden;
    if (hidden) {
      this.lastHiddenAt = this.dependencies.now();
      this.patchSnapshot({ isEnvParamsTyping: false });
      return;
    }

    const now = this.dependencies.now();
    if (this.lastHiddenAt && now - this.lastHiddenAt > ENV_VISIBILITY_GAIN_THRESHOLD_MS) {
      this.noteArtifactGain('visibility-return');
    }
    this.lastHiddenAt = null;
    this.resume();
  }

  scrolled() {
    if (!this.canRender()) return;
    const now = this.dependencies.now();
    if (now - this.lastScrollGainAt < ENV_SCROLL_GAIN_COOLDOWN_MS) return;
    this.lastScrollGainAt = now;
    this.noteArtifactGain('scroll');
    if (this.initialized) this.runPulse(false);
  }

  dwell() {
    if (!this.canRender() || !this.initialized || this.artifactLoad >= 70) return;
    this.noteArtifactGain('dwell');
    this.runPulse(false);
  }

  decay() {
    if (!this.canRender() || !this.initialized) return;
    if (this.dependencies.now() - this.lastArtifactGainAt < ENV_IDLE_DECAY_THRESHOLD_MS) return;
    const nextLoad = decayArtifactLoad(this.artifactLoad);
    if (nextLoad === this.artifactLoad) return;
    this.pushLoad(nextLoad, true);
    this.runPulse(false);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  private patchSnapshot(patch: Partial<EnvParamsTypingState>) {
    const next = { ...this.snapshot, ...patch };
    if (
      next.displayedEnvParams === this.snapshot.displayedEnvParams &&
      next.isEnvParamsTyping === this.snapshot.isEnvParamsTyping &&
      next.envData === this.snapshot.envData &&
      next.envDataVersion === this.snapshot.envDataVersion &&
      next.envArtifactStage === this.snapshot.envArtifactStage
    )
      return;
    this.snapshot = next;
    this.emit();
  }

  private canRender() {
    return this.active && this.routeEnabled && this.documentVisible;
  }

  private resume() {
    if (!this.active || !this.canRender()) return;
    if (!this.initialized) {
      this.ensureBooted();
      return;
    }
    if (this.pendingWork !== 'none') {
      this.runPulse(this.pendingWork === 'refresh');
    } else if (!this.refreshTimer) {
      this.scheduleNextRefresh();
    }
  }

  private clearTimers() {
    const { scheduler } = this.dependencies;
    scheduler.clearTimeout(this.bootTimer);
    scheduler.clearTimeout(this.refreshTimer);
    scheduler.clearTimeout(this.animationTimer);
    this.bootTimer = undefined;
    this.refreshTimer = undefined;
    this.animationTimer = undefined;
  }

  private ensureBooted() {
    if (!this.active || this.initialized || this.bootTimer !== undefined) return;
    this.bootTimer = this.dependencies.scheduler.setTimeout(() => {
      this.bootTimer = undefined;
      if (!this.canRender()) {
        this.queueWork(false);
        return;
      }
      this.initialized = true;
      this.lastArtifactGainAt = this.dependencies.now();
      const envData = this.createNextEnvData();
      const telemetry = this.syncEnvSnapshot(envData);
      this.applyStage(0);
      this.pulseCounter += 1;
      const target = buildTelemetryArtifactText({
        snapshot: telemetry,
        previousBuffer: '',
        stage: 0,
        seed: `${telemetry.id}:0:${this.pulseCounter}:stable`,
        envData,
      });
      this.typeInitialBlock(target);
      this.scheduleNextRefresh();
    }, ENV_INITIAL_BOOT_DELAY);
  }

  private randomRefreshDelay() {
    return ENV_REFRESH_MIN_MS + Math.floor(this.dependencies.random() * ENV_REFRESH_JITTER_MS);
  }

  private scheduleNextRefresh(delay = this.randomRefreshDelay()) {
    this.dependencies.scheduler.clearTimeout(this.refreshTimer);
    this.refreshTimer = this.dependencies.scheduler.setTimeout(() => {
      this.refreshTimer = undefined;
      this.queueWork(true);
      if (this.canRender()) this.runPulse(true);
    }, delay);
  }

  private noteArtifactGain(reason: ArtifactGainReason) {
    this.lastArtifactGainAt = this.dependencies.now();
    this.pushLoad(advanceArtifactLoad(this.artifactLoad, reason));
  }

  private queueWork(refreshSnapshot: boolean) {
    if (refreshSnapshot || this.pendingWork === 'none') {
      this.pendingWork = refreshSnapshot ? 'refresh' : 'pulse';
    }
  }

  private pushLoad(nextLoad: number, shouldPulse = true) {
    this.artifactLoad = Math.max(0, Math.min(100, Math.round(nextLoad)));
    this.applyStage(computeArtifactStage(this.artifactLoad));
    if (shouldPulse) this.queueWork(false);
  }

  private applyStage(stage: EnvArtifactStage) {
    this.patchSnapshot({ envArtifactStage: stage });
  }

  private createNextEnvData(): EnvData {
    const random = this.dependencies.random;
    this.currentTemp = Math.max(44, Math.min(66, this.currentTemp + random() * 3 - 1.5));
    const pollutionLevels = ['SEVERE', 'CRITICAL', 'UNSTABLE', 'HAZARDOUS'];
    const rainStatus = ['IMMINENT', 'LIKELY', 'UNLIKELY', 'CERTAIN'];
    return {
      temp: this.currentTemp,
      rad: Math.floor(200 + random() * 300),
      o2: Number((8 + random() * 2).toFixed(1)),
      pollution:
        pollutionLevels[Math.floor(random() * pollutionLevels.length)] ?? pollutionLevels[0],
      acidRain: rainStatus[Math.floor(random() * rainStatus.length)] ?? rainStatus[0],
    };
  }

  private syncEnvSnapshot(envData: EnvData) {
    const telemetry = createTelemetrySnapshot(envData, this.telemetryVariant);
    this.telemetryVariant += 1;
    this.currentTelemetrySnapshot = telemetry;
    this.patchSnapshot({ envData, envDataVersion: this.snapshot.envDataVersion + 1 });
    return telemetry;
  }

  private finishPulse(finalText: string) {
    this.animationTimer = undefined;
    this.pendingWork = 'none';
    this.patchSnapshot({ displayedEnvParams: finalText, isEnvParamsTyping: false });
  }

  private typeInitialBlock(target: string) {
    this.patchSnapshot({ displayedEnvParams: '', isEnvParamsTyping: true });
    const step = (index: number) => {
      if (!this.canRender()) {
        this.queueWork(false);
        this.patchSnapshot({ isEnvParamsTyping: false });
        return;
      }
      if (index >= target.length) {
        this.finishPulse(target);
        return;
      }
      this.patchSnapshot({ displayedEnvParams: this.snapshot.displayedEnvParams + target[index] });
      this.animationTimer = this.dependencies.scheduler.setTimeout(
        () => step(index + 1),
        ENV_INITIAL_TYPE_DELAY_MS,
      );
    };
    step(0);
  }

  private overwriteToTarget(target: string) {
    const current = this.snapshot.displayedEnvParams;
    if (!current) {
      this.typeInitialBlock(target);
      return;
    }
    const maxLength = Math.max(current.length, target.length);
    const working = Array.from({ length: maxLength }, (_, index) => current[index] ?? '');
    const targetChars = Array.from({ length: maxLength }, (_, index) => target[index] ?? '');
    const indices = targetChars
      .map((character, index) => (working[index] === character ? -1 : index))
      .filter((index) => index >= 0);

    if (!indices.length) {
      this.finishPulse(target);
      return;
    }
    this.patchSnapshot({ isEnvParamsTyping: true });
    const step = () => {
      if (!this.canRender()) {
        this.queueWork(false);
        this.patchSnapshot({ isEnvParamsTyping: false });
        return;
      }
      if (!indices.length) {
        this.finishPulse(target);
        return;
      }
      const random = this.dependencies.random;
      const batchSize =
        ENV_OVERWRITE_BATCH_MIN +
        Math.floor(random() * (ENV_OVERWRITE_BATCH_MAX - ENV_OVERWRITE_BATCH_MIN + 1));
      for (let count = 0; count < batchSize && indices.length; count += 1) {
        const picked = Math.floor(random() * indices.length);
        const targetIndex = indices.splice(picked, 1)[0];
        working[targetIndex] = targetChars[targetIndex];
      }
      this.patchSnapshot({ displayedEnvParams: working.join('') });
      this.animationTimer = this.dependencies.scheduler.setTimeout(step, ENV_OVERWRITE_DELAY_MS);
    };
    step();
  }

  private runPulse(refreshSnapshot: boolean) {
    if (!this.canRender()) {
      this.queueWork(refreshSnapshot);
      return;
    }
    this.dependencies.scheduler.clearTimeout(this.animationTimer);
    this.animationTimer = undefined;
    const envData =
      refreshSnapshot || !this.snapshot.envData ? this.createNextEnvData() : this.snapshot.envData;
    const telemetry =
      refreshSnapshot || !this.currentTelemetrySnapshot
        ? this.syncEnvSnapshot(envData)
        : this.currentTelemetrySnapshot;
    const stage = computeArtifactStage(this.artifactLoad);
    this.applyStage(stage);
    this.pulseCounter += 1;
    const target = buildTelemetryArtifactText({
      snapshot: telemetry,
      previousBuffer: this.snapshot.displayedEnvParams || telemetry.text,
      stage,
      seed: `${telemetry.id}:${stage}:${this.pulseCounter}:${hashDisplayedBuffer(this.snapshot.displayedEnvParams)}`,
      envData,
    });
    this.pendingWork = 'none';
    this.overwriteToTarget(target);
    this.scheduleNextRefresh();
  }
}
