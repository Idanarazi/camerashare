// PicMe's sounds: the "connected" moment and the countdown beeps.
// The connected moment: the phone that scanned plays a short swell that builds up;
// the camera phone lands it a beat later. Both phones buzz together on the landing.
// The sounds are made by assets/sounds/make-sounds.py (option "swell").
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { haptic } from './motion';

const SOURCES = {
  swell: require('../../assets/sounds/connect-swell.wav'),
  land: require('../../assets/sounds/connect-land.wav'),
  beep: require('../../assets/sounds/beep.wav'),
  beepGo: require('../../assets/sounds/beep-go.wav'),
};
type SoundName = keyof typeof SOURCES;

/** When the landing hits, in ms after both phones hear "connected". */
export const LAND_AT = 400;

let prepared = false;
const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** Load the sounds ahead of time, so they play the instant the phones connect. */
export function prepareSounds() {
  if (prepared) return;
  prepared = true;
  // Stay quiet when the phone is on silent, and never pause the user's music.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  (Object.keys(SOURCES) as SoundName[]).forEach((name) => {
    try {
      players[name] = createAudioPlayer(SOURCES[name]);
    } catch {
      // No sound is fine; the buzz still happens.
    }
  });
}

function play(name: SoundName) {
  const p = players[name];
  if (!p) return;
  try {
    if (p.currentTime > 0.01) p.seekTo(0).finally(() => p.play());
    else p.play();
  } catch {}
}

/** Countdown: a soft beep on 3, 2, 1 and a brighter one on the shot. */
export function countdownBeep(final: boolean) {
  prepareSounds();
  play(final ? 'beepGo' : 'beep');
}

/**
 * The two phones just connected. `role` is this phone's side; `withSound` is false after
 * a reconnect or when sounds are off in Settings. Returns a cancel function for effect cleanup.
 */
export function connectedFeedback(role: 'director' | 'photographer', withSound: boolean) {
  prepareSounds();
  if (withSound && role === 'director') play('swell');
  const id = setTimeout(() => {
    if (withSound && role === 'photographer') play('land');
    haptic.success();
  }, LAND_AT);
  return () => clearTimeout(id);
}
