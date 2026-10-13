// Motion, haptics and accessibility preferences, in one place.
// Springs follow Apple's defaults: critically damped (no bounce) for UI, a little bounce only after a flick.
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Reanimated spring configs (duration ≈ Apple's "response"). */
export const spring = {
  ui: { duration: 350, dampingRatio: 1 }, // default: settles smoothly, no overshoot
  flick: { duration: 400, dampingRatio: 0.82 }, // only when the gesture carried momentum
  press: { duration: 160, dampingRatio: 1 }, // button press-in / release
};

/** Where a flick would come to rest (Apple's projection, normal scroll deceleration). */
export function project(velocityPxPerSec: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

function useA11yFlag(read: () => Promise<boolean>, event: 'reduceMotionChanged' | 'reduceTransparencyChanged') {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    read().then((v) => alive && setOn(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener(event, (v: boolean) => setOn(v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, [read, event]);
  return on;
}

export const useReducedMotion = () => useA11yFlag(AccessibilityInfo.isReduceMotionEnabled, 'reduceMotionChanged');
export const useReducedTransparency = () =>
  useA11yFlag(Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled : () => Promise.resolve(false), 'reduceTransparencyChanged');

/** Haptics only for moments that matter: a commit, a success, a warning. Never on every tap. */
const run = (fn: () => Promise<void>) => {
  if (Platform.OS !== 'web') fn().catch(() => {});
};
export const haptic = {
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), // a ♥, a snap into place
  select: () => run(() => Haptics.selectionAsync()), // ticking past items while scrubbing
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), // scanned, connected
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)), // someone is asking to join
};
