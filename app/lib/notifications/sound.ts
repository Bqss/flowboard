let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null;
  audioContext ??= new window.AudioContext();
  return audioContext;
};

export const unlockNotificationSound = async () => {
  const context = getAudioContext();
  if (context?.state === 'suspended') await context.resume();
};

export const playNotificationSound = () => {
  const context = getAudioContext();
  if (!context || context.state !== 'running') return;

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(720, now);
  oscillator.frequency.exponentialRampToValueAtTime(960, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.34);
};
