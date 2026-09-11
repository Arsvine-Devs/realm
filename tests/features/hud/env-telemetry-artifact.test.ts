import { describe, expect, it } from 'vitest';

import type { EnvData } from '@/shared/contracts/environment';
import {
  advanceArtifactLoad,
  buildTelemetryArtifactText,
  computeArtifactStage,
  createTelemetrySnapshot,
  decayArtifactLoad,
} from '@/features/hud/model/env-telemetry-artifact';

const envData: EnvData = {
  temp: 53.7,
  rad: 268,
  o2: 9.9,
  pollution: 'SEVERE',
  acidRain: 'LIKELY',
};

describe('createTelemetrySnapshot', () => {
  it('builds a readable six-line telemetry block', () => {
    const snapshot = createTelemetrySnapshot(envData, 0);

    expect(snapshot.lines).toHaveLength(6);
    expect(snapshot.text).toContain('TEMP: 53.7°C');
    expect(snapshot.text).toContain('RAD: 268mSv/h');
    expect(snapshot.text).toContain('O2: 9.9%');
    expect(/HUM|VIS|BAR|DEW/.test(snapshot.text)).toBe(true);
    expect(/WIND|AQ|PH|H2O/.test(snapshot.text)).toBe(true);
    expect(snapshot.text).toContain('POLLUTION');
    expect(snapshot.text).toContain('ACID RAIN');
  });

  it('rotates through multiple compact telemetry themes', () => {
    const ids = new Set(
      Array.from({ length: 10 }, (_, index) => createTelemetrySnapshot(envData, index).id),
    );
    const warningLines = Array.from(
      { length: 10 },
      (_, index) => createTelemetrySnapshot(envData, index).lines[5],
    );
    const primaryMetricLines = Array.from({ length: 10 }, (_, index) =>
      createTelemetrySnapshot(envData, index).lines.slice(0, 3).join('\n'),
    );

    expect(ids.size).toBeGreaterThanOrEqual(6);
    expect(warningLines.some((line) => /WATER|VIS|PRESSURE|CANOPY|BIOSPHERE|AIR/.test(line))).toBe(
      true,
    );
    expect(warningLines.every((line) => line.length <= 30)).toBe(true);
    expect(primaryMetricLines.some((block) => /HUM|VIS|BAR|DEW/.test(block))).toBe(true);
    expect(primaryMetricLines.some((block) => /WIND|AQ|PH|H2O/.test(block))).toBe(true);
  });
});

describe('buildTelemetryArtifactText', () => {
  it('keeps stage 0 fully readable', () => {
    const snapshot = createTelemetrySnapshot(envData, 0);
    const text = buildTelemetryArtifactText({
      snapshot,
      previousBuffer: '',
      stage: 0,
      seed: 'stable-seed',
      envData,
    });

    expect(text).toBe(snapshot.text);
    expect(text).toContain('TEMP');
    expect(text).toContain('RAD');
    expect(text).toContain('O2');
    expect(text).toContain('mSv/h');
    expect(text).toContain('°C');
  });

  it('keeps stage 1 mostly readable with light drift only', () => {
    const snapshot = createTelemetrySnapshot(envData, 0);
    const text = buildTelemetryArtifactText({
      snapshot,
      previousBuffer: snapshot.text,
      stage: 1,
      seed: 'stage-1-seed',
      envData,
    });

    expect(text).toContain('TEMP');
    expect(text).toContain('RAD');
    expect(text).toContain('O2');
    expect(/POLL/.test(text)).toBe(true);
    expect(/ACID/.test(text)).toBe(true);
    expect(text.split('\n')).toHaveLength(6);
    expect(text.split('\n').every((line) => line.length <= 30)).toBe(true);
  });

  it('produces residual overwrite artifacts at stage 2 and 3', () => {
    const snapshot = createTelemetrySnapshot(envData, 0);
    const previousBuffer = [
      'T°TEMP: 55.4°CC',
      'RRAD: 332707mSSvv//hh',
      'O022: 98.92%%',
      'PPOOLLLUUTTIIOONN: UUNNSSTTAABBLLEE',
      'AACCIIDD RRAAIINN: ULNLIKELY',
      'URGENT: OXYGEN DEPLETION',
    ].join('\n');

    const stageTwo = buildTelemetryArtifactText({
      snapshot,
      previousBuffer,
      stage: 2,
      seed: 'stage-2-seed',
      envData,
    });
    const stageThree = buildTelemetryArtifactText({
      snapshot,
      previousBuffer,
      stage: 3,
      seed: 'stage-3-seed',
      envData,
    });

    expect(stageTwo).not.toBe(snapshot.text);
    expect(stageThree).not.toBe(snapshot.text);
    expect(/POLLUTION|PPOOL|ACID|RAIN|OXYGEN|DEPLETION/.test(stageThree)).toBe(true);
    expect(/[°%/]/.test(stageThree)).toBe(true);
    expect(stageThree.split('\n')).toHaveLength(6);
    expect(
      stageThree.split('\n').filter((line) => line.includes(':')).length,
    ).toBeGreaterThanOrEqual(5);
    expect(stageThree.split('\n').every((line) => line.length <= 30)).toBe(true);
  });

  it('keeps stage 4 deterministic and half-readable', () => {
    const snapshot = createTelemetrySnapshot(envData, 0);
    const previousBuffer = snapshot.text;
    const first = buildTelemetryArtifactText({
      snapshot,
      previousBuffer,
      stage: 4,
      seed: 'artifact-seed',
      envData,
    });
    const second = buildTelemetryArtifactText({
      snapshot,
      previousBuffer,
      stage: 4,
      seed: 'artifact-seed',
      envData,
    });

    expect(first).toBe(second);
    expect(/POLL|ACID|OXYGEN|DEPLETION|URGENT|ALERT|CAUTION/.test(first)).toBe(true);
    expect(first).toContain(':');
    expect(first).toContain('%');
    expect(first.split('\n').every((line) => line.length <= 30)).toBe(true);
  });
});

describe('artifact load progression', () => {
  it('maps load to the expected stages', () => {
    expect(computeArtifactStage(0)).toBe(0);
    expect(computeArtifactStage(20)).toBe(1);
    expect(computeArtifactStage(45)).toBe(2);
    expect(computeArtifactStage(70)).toBe(3);
    expect(computeArtifactStage(88)).toBe(4);
  });

  it('advances and decays load within bounds', () => {
    let load = 0;
    load = advanceArtifactLoad(load, 'dwell');
    expect(load).toBe(8);

    load = advanceArtifactLoad(load, 'route');
    expect(load).toBe(26);

    load = advanceArtifactLoad(92, 'scroll');
    expect(load).toBe(98);

    expect(decayArtifactLoad(98)).toBe(86);
    expect(decayArtifactLoad(5)).toBe(0);
    expect(advanceArtifactLoad(95, 'visibility-return')).toBe(100);
  });
});
