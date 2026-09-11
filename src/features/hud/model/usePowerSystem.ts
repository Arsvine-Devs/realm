import { startTransition, useState, useEffect, useRef, useCallback } from 'react';
import type { PowerSystemState } from '@/features/hud/contracts/state';
import { POWER_SYSTEM_STORAGE_KEY, THEME_MODE_STORAGE_KEY } from '@/shared/lib/document-bootstrap';

// CHARGE_STEP: 每次 chargeBattery() 调用的电量增加百分点。
// 桌面端由 Tesseract 拖近电池触发（200ms cooldown），移动端由 MainLayout 200ms interval 触发。
// 12 = 旧值 8 的 1.5×，相当于充电速度提升 50%；满电约 5–6 次触发 ≈ 1.1s。
const CHARGE_STEP = 12;
const DISCHARGE_STEP = 1;
const DISCHARGE_INTERVAL_MS = 50;
const DEFAULT_POWER_LEVEL = 67;
const DEFAULT_TESSERACT_ACTIVATED = false;
const DEFAULT_DISCHARGING = false;
const PERSIST_DELAY_MS = 250;

interface PersistedPowerState {
  powerLevel: number;
  isTesseractActivated: boolean;
  isDischarging: boolean;
}

function persistPowerState(state: PersistedPowerState) {
  try {
    const serialized = JSON.stringify(state);
    window.sessionStorage.setItem(POWER_SYSTEM_STORAGE_KEY, serialized);
    window.localStorage.setItem(POWER_SYSTEM_STORAGE_KEY, serialized);
  } catch {
    // Storage can be unavailable in private browsing or under strict browser policies.
  }
}

function readPersistedPowerState() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw =
      window.sessionStorage.getItem(POWER_SYSTEM_STORAGE_KEY) ??
      window.localStorage.getItem(POWER_SYSTEM_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.powerLevel !== 'number' ||
      typeof parsed?.isTesseractActivated !== 'boolean' ||
      typeof parsed?.isDischarging !== 'boolean'
    ) {
      return null;
    }

    return {
      powerLevel: Math.max(0, Math.min(100, parsed.powerLevel)),
      isTesseractActivated: parsed.isTesseractActivated,
      isDischarging: parsed.isDischarging,
    };
  } catch {
    return null;
  }
}

export default function usePowerSystem(mainVisible: boolean): PowerSystemState {
  const [powerLevel, setPowerLevel] = useState(DEFAULT_POWER_LEVEL);
  const [isTesseractActivated, setIsTesseractActivated] = useState(DEFAULT_TESSERACT_ACTIVATED);
  const [isDischarging, setIsDischarging] = useState(DEFAULT_DISCHARGING);
  const dischargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDischargingRef = useRef(DEFAULT_DISCHARGING);
  const persistTimeoutRef = useRef<number | null>(null);
  const latestPersistedStateRef = useRef<PersistedPowerState>({
    powerLevel: DEFAULT_POWER_LEVEL,
    isTesseractActivated: DEFAULT_TESSERACT_ACTIVATED,
    isDischarging: DEFAULT_DISCHARGING,
  });

  // Inverted mode is purely derived from power state — no separate state needed.
  const isInverted = powerLevel === 100 && !isDischarging;

  useEffect(() => {
    const persisted = readPersistedPowerState();
    if (!persisted) {
      return;
    }

    startTransition(() => {
      setPowerLevel(persisted.powerLevel);
      setIsTesseractActivated(persisted.isTesseractActivated);
      setIsDischarging(persisted.isDischarging);
    });
    isDischargingRef.current = persisted.isDischarging;
  }, []);

  useEffect(() => {
    isDischargingRef.current = isDischarging;
  }, [isDischarging]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextState = {
      powerLevel,
      isTesseractActivated,
      isDischarging,
    };
    latestPersistedStateRef.current = nextState;

    if (persistTimeoutRef.current !== null) return;
    persistTimeoutRef.current = window.setTimeout(() => {
      persistTimeoutRef.current = null;
      persistPowerState(latestPersistedStateRef.current);
    }, PERSIST_DELAY_MS);
  }, [powerLevel, isTesseractActivated, isDischarging]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const themeMode = isInverted ? 'inverted' : 'default';
    try {
      window.sessionStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {
      // Theme persistence is optional when browser storage is unavailable.
    }
    document.documentElement.setAttribute('data-theme-mode', themeMode);
  }, [isInverted]);

  useEffect(
    () => () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
      }
      persistPowerState(latestPersistedStateRef.current);
    },
    [],
  );

  const stopDischarge = useCallback(() => {
    if (dischargeIntervalRef.current) {
      clearInterval(dischargeIntervalRef.current);
      dischargeIntervalRef.current = null;
    }
    if (isDischargingRef.current) {
      isDischargingRef.current = false;
      setIsDischarging(false);
    }
  }, []);

  // Natural power consumption
  useEffect(() => {
    if (!mainVisible) return;

    const intervalId = setInterval(() => {
      setPowerLevel((prevLevel) => {
        if (!isDischarging && prevLevel < 100) {
          const decrease = Math.floor(Math.random() * 3) + 1;
          return Math.max(0, prevLevel - decrease);
        }
        return prevLevel;
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [mainVisible, isDischarging]);

  // Charge battery (called by Tesseract interaction)
  const chargeBattery = useCallback(() => {
    if (isDischargingRef.current) {
      stopDischarge();
    }
    setPowerLevel((prevLevel) => {
      if (prevLevel >= 100) return 100;
      const newLevel = Math.min(100, prevLevel + CHARGE_STEP);
      return newLevel;
    });
  }, [stopDischarge]);

  // Discharge lever pull handler
  const handleDischargeLeverPull = useCallback(() => {
    if (powerLevel === 100 && !isDischarging) {
      setIsTesseractActivated(false);
      setIsDischarging(true);
    }
  }, [isDischarging, powerLevel]);

  // Discharge process
  useEffect(() => {
    if (isDischarging) {
      if (dischargeIntervalRef.current) {
        clearInterval(dischargeIntervalRef.current);
      }
      dischargeIntervalRef.current = setInterval(() => {
        setPowerLevel((prevLevel) => {
          const nextLevel = Math.max(0, prevLevel - DISCHARGE_STEP);
          if (nextLevel === 0) {
            stopDischarge();
          }
          return nextLevel;
        });
      }, DISCHARGE_INTERVAL_MS);

      return () => {
        if (dischargeIntervalRef.current) {
          clearInterval(dischargeIntervalRef.current);
          dischargeIntervalRef.current = null;
        }
      };
    } else {
      stopDischarge();
    }
  }, [isDischarging, stopDischarge]);

  // Activate Tesseract
  const handleActivateTesseract = useCallback(() => {
    if (isDischargingRef.current) {
      stopDischarge();
    }
    if (!isTesseractActivated) {
      setIsTesseractActivated(true);
    }
  }, [isTesseractActivated, stopDischarge]);

  const deactivateTesseract = useCallback(() => {
    setIsTesseractActivated(false);
  }, []);

  return {
    powerLevel,
    isInverted,
    isTesseractActivated,
    isDischarging,
    chargeBattery,
    handleDischargeLeverPull,
    handleActivateTesseract,
    deactivateTesseract,
  };
}
