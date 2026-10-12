// The guiding vocabulary between the two phones. Same command names as the website,
// so an app phone can direct a website camera and the other way round.

export type Command =
  | 'move-left' | 'move-right' | 'move-up' | 'move-down'
  | 'move-closer' | 'step-back' | 'hold'
  | 'torch' | 'start-capture';

export type Steer = Exclude<Command, 'torch' | 'start-capture'>;

/** What the directing phone confirms it sent ("Sent: Move left"). */
export const SENT_LABEL: Record<Steer, string> = {
  'move-left': 'Move left',
  'move-right': 'Move right',
  'move-up': 'Move up',
  'move-down': 'Move down',
  'move-closer': 'Move closer',
  'step-back': 'Step back',
  hold: 'Hold it',
};

/** What the camera phone shows for each one. */
export const CUE_LABEL: Record<Steer, string> = {
  'move-left': 'Left',
  'move-right': 'Right',
  'move-up': 'Up',
  'move-down': 'Down',
  'move-closer': 'Move closer',
  'step-back': 'Step back',
  hold: 'Hold it, perfect!',
};

/** Seconds on the countdown, on both phones. */
export const COUNTDOWN = 3;

/** Gap between photos in a burst. */
export const BURST_GAP_MS = 140;

/** A swipe of this many points is a direction (same as the website). */
export const SWIPE_MIN = 45;
