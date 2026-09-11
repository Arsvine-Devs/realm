import type { EnvArtifactStage, EnvData } from '@/shared/contracts/environment';
import { hashStringFnv1a } from '@/shared/lib/hash';

export type ArtifactGainReason = 'dwell' | 'route' | 'visibility-return' | 'scroll';

export interface TelemetrySnapshot {
  id: string;
  lines: string[];
  text: string;
}

interface TelemetryProfile {
  id: string;
  pollutionLine: (envData: EnvData) => string;
  rainLine: (envData: EnvData) => string;
  warningLine: (envData: EnvData) => string;
}

interface BuildTelemetryArtifactTextOptions {
  snapshot: TelemetrySnapshot;
  previousBuffer: string;
  stage: EnvArtifactStage;
  seed: string;
  envData: EnvData;
}

const MAX_LINE_LENGTH = 30;

const TELEMETRY_PROFILES: readonly TelemetryProfile[] = [
  {
    id: 'basin-core',
    pollutionLine: (envData) => `POLLUTION: ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: ${envData.acidRain}`,
    warningLine: () => 'URGENT: OXYGEN DEPLETION',
  },
  {
    id: 'delta-front',
    pollutionLine: (envData) => `POLLUTION: DUST ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: STORM ${envData.acidRain}`,
    warningLine: () => 'ALERT: WATER STRESS',
  },
  {
    id: 'ash-plume',
    pollutionLine: (envData) => `POLLUTION: ASH ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: ASH ${envData.acidRain}`,
    warningLine: () => 'CAUTION: AIR SHEAR',
  },
  {
    id: 'biosphere-drift',
    pollutionLine: (envData) => `POLLUTION: BIOHAZE ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: SPORE ${envData.acidRain}`,
    warningLine: () => 'CAUTION: OXYGEN DEPLETION',
  },
  {
    id: 'fog-breach',
    pollutionLine: (envData) => `POLLUTION: TOXIC ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: FOG ${envData.acidRain}`,
    warningLine: () => 'ALERT: VIS DROP',
  },
  {
    id: 'saline-drought',
    pollutionLine: (envData) => `POLLUTION: SALT ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: DRIFT ${envData.acidRain}`,
    warningLine: () => 'URGENT: WATER LOSS',
  },
  {
    id: 'reef-collapse',
    pollutionLine: (envData) => `POLLUTION: TIDE ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: SURGE ${envData.acidRain}`,
    warningLine: () => 'ALERT: BIOSPHERE DROP',
  },
  {
    id: 'storm-seam',
    pollutionLine: (envData) => `POLLUTION: FRONT ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: CELL ${envData.acidRain}`,
    warningLine: () => 'CAUTION: PRESSURE FALL',
  },
  {
    id: 'ice-melt',
    pollutionLine: (envData) => `POLLUTION: RUNOFF ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: MELT ${envData.acidRain}`,
    warningLine: () => 'ALERT: THAW SURGE',
  },
  {
    id: 'canopy-burn',
    pollutionLine: (envData) => `POLLUTION: SMOKE ${envData.pollution}`,
    rainLine: (envData) => `ACID RAIN: HEAT ${envData.acidRain}`,
    warningLine: () => 'URGENT: CANOPY LOSS',
  },
] as const;

const NOISE_SUFFIXES = [' -', ' :', ' _', ' /', ' °', ' ::'] as const;

function deriveHumidity(envData: EnvData, variantSeed: number) {
  const baseline = 18 + ((variantSeed * 7) % 22);
  const cooling = Math.max(0, 58 - envData.temp) * 0.8;
  return Math.max(6, Math.min(68, Math.round(baseline + cooling)));
}

function deriveWind(envData: EnvData, variantSeed: number) {
  return 18 + ((variantSeed * 11) % 34) + Math.round((envData.rad - 200) / 25);
}

function deriveVisibility(envData: EnvData, variantSeed: number) {
  const raw = 9.4 - (variantSeed % 5) * 1.1 - (envData.rad - 200) / 180;
  return Math.max(0.8, Math.min(9.4, Number(raw.toFixed(1))));
}

function derivePh(envData: EnvData, variantSeed: number) {
  const raw = 3.1 + (variantSeed % 4) * 0.4 - (envData.o2 - 8) * 0.2;
  return Math.max(2.8, Math.min(5.8, Number(raw.toFixed(1))));
}

function derivePressure(envData: EnvData, variantSeed: number) {
  return 905 + ((variantSeed * 13) % 48) - Math.round((envData.temp - 44) * 1.6);
}

function deriveAirQuality(envData: EnvData, variantSeed: number) {
  return Math.round(190 + ((variantSeed * 23) % 120) + (envData.rad - 200) * 0.45);
}

function deriveWaterTag(variantSeed: number) {
  return ['TRACE', 'BRACK', 'LOW', 'THIN', 'SALT'][Math.abs(variantSeed) % 5] ?? 'LOW';
}

function buildPrimaryTelemetryLines(envData: EnvData, variantSeed: number) {
  const humidity = deriveHumidity(envData, variantSeed);
  const wind = deriveWind(envData, variantSeed);
  const visibility = deriveVisibility(envData, variantSeed);
  const ph = derivePh(envData, variantSeed);
  const pressure = derivePressure(envData, variantSeed);
  const airQuality = deriveAirQuality(envData, variantSeed);
  const waterTag = deriveWaterTag(variantSeed);

  const lineSets = [
    [
      `TEMP: ${envData.temp.toFixed(1)}°C / HUM: ${humidity}%`,
      `RAD: ${envData.rad}mSv/h / WIND: ${wind}k`,
      `O2: ${envData.o2.toFixed(1)}% / PH: ${ph}`,
    ],
    [
      `TEMP: ${envData.temp.toFixed(1)}°C / VIS: ${visibility}k`,
      `RAD: ${envData.rad}mSv/h / AQ: ${airQuality}`,
      `O2: ${envData.o2.toFixed(1)}% / H2O: ${waterTag}`,
    ],
    [
      `TEMP: ${envData.temp.toFixed(1)}°C / BAR: ${pressure}`,
      `RAD: ${envData.rad}mSv/h / VIS: ${visibility}k`,
      `O2: ${envData.o2.toFixed(1)}% / WIND: ${wind}k`,
    ],
    [
      `TEMP: ${envData.temp.toFixed(1)}°C / DEW: ${Math.max(-9, Math.round(envData.o2 - envData.temp / 10))}°`,
      `RAD: ${envData.rad}mSv/h / PH: ${ph}`,
      `O2: ${envData.o2.toFixed(1)}% / AQ: ${airQuality}`,
    ],
  ] as const;

  return lineSets[Math.abs(variantSeed) % lineSets.length] ?? lineSets[0];
}

function clampLoad(load: number) {
  return Math.max(0, Math.min(100, Math.round(load)));
}

function createSeededRandom(seed: string) {
  let state = hashStringFnv1a(seed) || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne<T>(items: readonly T[], random: () => number) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function splitLines(block: string) {
  const lines = block.split('\n');
  while (lines.length < 6) {
    lines.push('');
  }
  return lines.slice(0, 6);
}

function capLine(line: string, limit = MAX_LINE_LENGTH) {
  const trimmed = line.replace(/\s+/g, ' ').trim();
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed;
}

function capKeyValueLine(label: string, value: string, limit = MAX_LINE_LENGTH) {
  const normalizedLabel = label.replace(/\s+/g, ' ').trim();
  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  const prefix = `${normalizedLabel}: `;
  if (prefix.length >= limit) {
    return capLine(prefix, limit);
  }

  const valueBudget = Math.max(0, limit - prefix.length);
  return `${prefix}${capLine(normalizedValue, valueBudget)}`;
}

function duplicateBurst(text: string, random: () => number, bursts: number, maxRepeat = 2) {
  let next = text;
  for (let count = 0; count < bursts; count += 1) {
    const indices = Array.from(next)
      .map((char, index) => ({ char, index }))
      .filter(({ char }) => /[A-Z0-9]/.test(char));

    if (indices.length === 0) {
      return next;
    }

    const { index, char } = pickOne(indices, random);
    const repeatCount = 1 + Math.floor(random() * maxRepeat);
    next = `${next.slice(0, index)}${char.repeat(repeatCount)}${next.slice(index)}`;
  }
  return next;
}

function injectNoiseSuffix(line: string, random: () => number) {
  return `${line}${pickOne(NOISE_SUFFIXES, random)}`;
}

function readableFragmentsFromLines(lines: string[]) {
  return lines
    .flatMap((line) => line.match(/[A-Z0-9°/%]+/g) ?? [])
    .filter((fragment) => fragment.length >= 2);
}

function graftFragment(base: string, donor: string, random: () => number, aggressive = false) {
  const fragments = readableFragmentsFromLines([donor]);
  const fragment =
    fragments.length > 0
      ? pickOne(fragments, random)
      : donor.replace(/[^A-Z0-9°/%]/g, '').slice(0, 6);
  if (!fragment) {
    return base;
  }

  if (!aggressive) {
    return capLine(`${fragment.slice(0, 3)} ${base}`);
  }

  const pivot = base.indexOf(':');
  if (pivot === -1) {
    return capLine(`${fragment}${base}`);
  }

  return capLine(`${base.slice(0, pivot)}${fragment.slice(0, 2)}${base.slice(pivot)}`);
}

function mergeTelemetryValue(currentValue: string, donor: string, random: () => number) {
  const donorValue = donor.split(':').slice(1).join(':').trim();
  if (!donorValue) {
    return currentValue;
  }

  const donorFragment = donorValue.replace(/\s+/g, '').slice(0, 4);
  if (!donorFragment) {
    return currentValue;
  }

  if (random() > 0.45) {
    return capLine(`${currentValue}${donorFragment.slice(0, 3)}`);
  }

  return capLine(`${donorFragment.slice(0, 3)}${currentValue}`);
}

function corruptAnchor(anchor: string, random: () => number, intensity: number) {
  let next = anchor.toUpperCase();
  const bursts = Math.min(2, Math.max(1, intensity - 1));
  next = duplicateBurst(next, random, bursts, intensity >= 4 ? 2 : 1);

  if (intensity >= 2 && random() > 0.45) {
    next = next.replace(/\s+/g, random() > 0.4 ? '' : ' ');
  }

  if (intensity >= 3 && random() > 0.55) {
    next = next.replace(/:/g, '::');
  }

  return capLine(next);
}

function corruptTelemetryValue(value: string, random: () => number, intensity: number) {
  let next = value.toUpperCase();
  next = duplicateBurst(next, random, Math.max(1, intensity - 1), intensity >= 3 ? 2 : 1);

  if (intensity >= 2 && random() > 0.55) {
    next = mergeTelemetryValue(next, value, random);
  }

  if (intensity >= 3 && random() > 0.5) {
    next = next.replace(/\//g, '//');
  }

  return capLine(next);
}

function buildStageOneLines(snapshot: TelemetrySnapshot, random: () => number) {
  return snapshot.lines.map((line, index) => {
    let next = line;
    if (random() > 0.62) {
      next = duplicateBurst(next, random, 1, 1);
    }
    if (random() > 0.74 || index === 5) {
      next = injectNoiseSuffix(next, random);
    }
    return capLine(next, 28);
  });
}

function buildStageTwoLines(
  snapshot: TelemetrySnapshot,
  previousBuffer: string,
  random: () => number,
) {
  const previousLines = splitLines(previousBuffer || snapshot.text);

  return snapshot.lines.map((line, index) => {
    let next = line;
    if (index < 3) {
      next = duplicateBurst(next, random, 1 + (random() > 0.72 ? 1 : 0), 2);
      if (random() > 0.7) {
        next = graftFragment(next, previousLines[index + 1] ?? previousLines[index], random);
      }
      return capLine(next, 28);
    }

    const [rawLabel, ...rest] = next.split(':');
    const donorLine = previousLines[index] || previousLines[index - 1];
    const stableLabel = random() > 0.68 ? corruptAnchor(rawLabel, random, 2) : rawLabel;
    let value = rest.join(':').trim();
    value = duplicateBurst(value, random, 2, 2);
    if (random() > 0.42) {
      value = mergeTelemetryValue(value, previousLines[index - 1] || previousLines[index], random);
    }
    if (random() > 0.58) {
      value = graftFragment(value, donorLine, random);
    }
    if (random() > 0.55) {
      value = injectNoiseSuffix(value, random).trim();
    }
    return capKeyValueLine(stableLabel, value, 28);
  });
}

function buildStageThreeLines(
  snapshot: TelemetrySnapshot,
  previousBuffer: string,
  random: () => number,
) {
  const previousLines = splitLines(previousBuffer || snapshot.text);

  return snapshot.lines.map((line, index) => {
    const [rawLabel, ...rest] = line.split(':');
    const rawValue = rest.join(':').trim();
    const donorLine = previousLines[index] || previousLines[Math.max(0, index - 1)];

    if (index < 3) {
      const label = random() > 0.55 ? corruptAnchor(rawLabel, random, 2) : rawLabel;
      let value = corruptTelemetryValue(rawValue, random, 2);
      value = mergeTelemetryValue(value, donorLine, random);
      return capKeyValueLine(label, value, 28);
    }

    const label = random() > 0.45 ? corruptAnchor(rawLabel, random, index === 5 ? 2 : 3) : rawLabel;
    let value = corruptAnchor(rawValue, random, index === 5 ? 3 : 2);
    value = mergeTelemetryValue(value, previousLines[index - 1] || donorLine, random);
    if (index === 5 && !/OXYGEN|DEPLETION/.test(value)) {
      value = capLine(`OXYGEN ${value}`, 18);
    }
    return capKeyValueLine(label, value, index === 5 ? 30 : 28);
  });
}

function buildStageFourLines(
  snapshot: TelemetrySnapshot,
  previousBuffer: string,
  random: () => number,
  envData: EnvData,
) {
  const previousLines = splitLines(previousBuffer || snapshot.text);
  const lines = [
    capKeyValueLine(
      corruptAnchor('TEMP', random, 2),
      corruptTelemetryValue(`${envData.temp.toFixed(1)}°C`, random, 3),
      28,
    ),
    capKeyValueLine(
      corruptAnchor('RAD', random, 2),
      corruptTelemetryValue(`${envData.rad}mSv/h`, random, 3),
      28,
    ),
    capKeyValueLine(
      corruptAnchor('O2', random, 1),
      corruptTelemetryValue(`${envData.o2.toFixed(1)}%`, random, 2),
      28,
    ),
    capKeyValueLine(
      corruptAnchor('POLLUTION', random, 2),
      corruptAnchor(envData.pollution, random, 2),
      28,
    ),
    capKeyValueLine(
      corruptAnchor('ACID RAIN', random, 2),
      corruptAnchor(envData.acidRain, random, 2),
      28,
    ),
    capKeyValueLine(
      corruptAnchor(pickOne(['URGENT', 'ALERT', 'CAUTION'], random), random, 2),
      corruptAnchor('OXYGEN DEPLETION', random, 3),
      30,
    ),
  ];

  return lines.map((line, index) => {
    const donor = previousLines[index] || previousLines[Math.max(0, index - 1)];
    const [rawLabel, ...rest] = line.split(':');
    let value = rest.join(':').trim();
    if (index >= 3) {
      value = mergeTelemetryValue(value, donor, random);
    } else if (random() > 0.52) {
      value = mergeTelemetryValue(value, donor, random);
    }
    if (index === 5 && !/OXYGEN|DEPLETION/.test(value)) {
      value = capLine(`OXYGEN ${value}`, 18);
    }
    return capKeyValueLine(rawLabel, value, index === 5 ? 30 : 28);
  });
}

export function createTelemetrySnapshot(envData: EnvData, variantSeed: number) {
  const normalizedIndex = Math.abs(Math.floor(variantSeed)) % TELEMETRY_PROFILES.length;
  const profile = TELEMETRY_PROFILES[normalizedIndex] ?? TELEMETRY_PROFILES[0];
  const primaryLines = buildPrimaryTelemetryLines(envData, variantSeed);
  const lines = [
    ...primaryLines,
    profile.pollutionLine(envData),
    profile.rainLine(envData),
    profile.warningLine(envData),
  ];

  return {
    id: profile.id,
    lines,
    text: lines.join('\n'),
  };
}

export function computeArtifactStage(load: number): EnvArtifactStage {
  const value = clampLoad(load);
  if (value >= 88) return 4;
  if (value >= 70) return 3;
  if (value >= 45) return 2;
  if (value >= 20) return 1;
  return 0;
}

export function advanceArtifactLoad(load: number, reason: ArtifactGainReason) {
  const current = clampLoad(load);

  switch (reason) {
    case 'dwell':
      return clampLoad(current + (current > 56 ? 4 : 8));
    case 'route':
      return clampLoad(current + 18);
    case 'visibility-return':
      return clampLoad(current + 10);
    case 'scroll':
      return clampLoad(current + 6);
    default:
      return current;
  }
}

export function decayArtifactLoad(load: number) {
  return clampLoad(load - 12);
}

export function buildTelemetryArtifactText({
  snapshot,
  previousBuffer,
  stage,
  seed,
  envData,
}: BuildTelemetryArtifactTextOptions) {
  if (stage === 0) {
    return snapshot.text;
  }

  const random = createSeededRandom(seed);

  switch (stage) {
    case 1:
      return buildStageOneLines(snapshot, random).join('\n');
    case 2:
      return buildStageTwoLines(snapshot, previousBuffer, random).join('\n');
    case 3:
      return buildStageThreeLines(snapshot, previousBuffer, random).join('\n');
    case 4:
      return buildStageFourLines(snapshot, previousBuffer, random, envData).join('\n');
    default:
      return snapshot.text;
  }
}
