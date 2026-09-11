import { useEffect, useState, useSyncExternalStore } from 'react';

import type { EnvParamsTypingState } from '@/features/hud/contracts/state';
import {
  EnvTelemetryController,
  ENV_DECAY_INTERVAL_MS,
  ENV_DWELL_INTERVAL_MS,
} from './envTelemetryController';
import { useNavigationRuntime } from '@/features/navigation/model/NavigationRuntime';

export function useEnvParamsTypingEffect(
  textVisible: boolean,
  routeEnabled: boolean,
): EnvParamsTypingState {
  const { asPath } = useNavigationRuntime();
  const [controller] = useState(() => new EnvTelemetryController());
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  useEffect(() => {
    if (!textVisible) {
      controller.stop();
      return;
    }
    controller.start();
    return () => controller.stop();
  }, [controller, textVisible]);

  useEffect(() => {
    controller.setRouteEnabled(routeEnabled);
  }, [controller, routeEnabled]);

  useEffect(() => {
    controller.routeChanged();
  }, [asPath, controller]);

  useEffect(() => {
    const handleVisibility = () => controller.visibilityChanged(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [controller]);

  useEffect(() => {
    const handleScroll = () => controller.scrolled();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [controller]);

  useEffect(() => {
    const interval = window.setInterval(() => controller.dwell(), ENV_DWELL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [controller]);

  useEffect(() => {
    const interval = window.setInterval(() => controller.decay(), ENV_DECAY_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [controller]);

  return snapshot;
}
