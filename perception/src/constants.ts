// See https://dev.to/deanius/the-thresholds-of-perception-in-ux-435g
export const THRESHOLD = {
  Frame: 16,
  Frame60: 16,
  Frame90: 11,
  Unison: 10,
  Chorus: 25,
  MovieFrame: 42,
  Echo: 100,
  Blink: 150,
  TypingKey90: 150,
  AnimationShort: 200,
  TypingKey48: 250,
  Debounce: 330,
  TypingKeyMobile: 330,
  AnimationLong: 400,
  EDMBeat: 500,
  DoubleClick: 500,
  Thought: 1000,
  PageLoadMax: 2000,
  DeepBreath: 4000,
  Sentence: 5000,
};

/** The 'ideal' debounce time- shorter than a long animation. About the
 * time it takes to type a key on a mobile interface.
 */
export const DEBOUNCE_DELAY = THRESHOLD.TypingKeyMobile;

/** The 'ideal' throttle time - long enough to catch most double-clicks */
export const THROTTLE_DELAY = THRESHOLD.DoubleClick;
