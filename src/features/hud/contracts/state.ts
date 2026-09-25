import type { EnvArtifactStage, EnvData } from '@/shared/contracts/environment';
export type { AdaptivePerformanceState } from '@/shared/contracts/performance';

export type ColumnPhase = 'idle' | 'retracting' | 'expanding';

export interface AnimationSequenceState {
  isLoading: boolean;
  mainVisible: boolean;
  linesAnimated: boolean;
  hudVisible: boolean;
  leftPanelAnimated: boolean;
  textVisible: boolean;
  animationsComplete: boolean;
  leversVisible: boolean;
  pulsingNormalIndices: number[] | null;
  pulsingReverseIndices: number[] | null;
  handleLoadingComplete: () => void;
  columnPhase: ColumnPhase;
  retractColumns: (onComplete: () => void) => void;
  expandColumns: (onComplete?: () => void) => void;
}

export interface PowerSystemState {
  powerLevel: number;
  isInverted: boolean;
  isTesseractActivated: boolean;
  isDischarging: boolean;
  chargeBattery: () => void;
  handleDischargeLeverPull: () => void;
  handleActivateTesseract: () => void;
  deactivateTesseract: () => void;
}

export interface RealtimeStatsState {
  currentTime: string;
  runtime: string;
}

export interface FateTypingState {
  displayedFateText: string;
  accessibleFateText: string;
  isFateTypingActive: boolean;
}

export interface EnvParamsTypingState {
  displayedEnvParams: string;
  isEnvParamsTyping: boolean;
  envData: EnvData | null;
  envDataVersion: number;
  envArtifactStage: EnvArtifactStage;
}

export interface ColumnHoverState {
  randomHudTexts: string[];
  branchText1: string;
  branchText2: string;
  branchText3: string;
  branchText4: string;
  handleColumnMouseEnter: (index: number) => void;
  handleColumnMouseLeave: (index: number) => void;
}
