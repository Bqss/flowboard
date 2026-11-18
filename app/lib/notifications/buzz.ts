import { toast } from '$lib/components/molecules/index.js';
import { playNotificationSound } from './sound.js';


/** Single short pulse used for regular alerts (messages, task notifications). */
export const DEFAULT_BUZZ_VIBRATE = 80;

/** Vibration pattern for a chat BUZZ: getar-jeda-getar-jeda-getar (milliseconds). */
export const CHAT_BUZZ_VIBRATE_PATTERN = [200, 100, 200, 100, 200];

export type BuzzOptions = {
  senderName: string;
  note?: string;
  title?: string;
  actionUrl?: string;
  onaction?: () => void;
  sound?: boolean;
  vibrate?: number | number[];
};

/**
 * Plays the standard notification tone and displays the Buzz alert.
 */
export const triggerBuzz = (options: BuzzOptions) => {
  if (
    typeof navigator !== 'undefined' &&
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible' &&
    typeof navigator.vibrate === 'function'
  ) {
    navigator.vibrate(options.vibrate ?? DEFAULT_BUZZ_VIBRATE);
  }
  if (options.sound !== false) playNotificationSound();
  const alertTitle = options.title || `Buzz dari ${options.senderName}`;
  const alertDesc = options.note || 'Perhatian: Ada mesej atau tugasan penting yang memerlukan tindakan anda segera!';

  toast.info(alertTitle, {
    description: alertDesc,
    duration: 9000,
    action: options.onaction || options.actionUrl
      ? {
          label: 'Buka sekarang',
          onclick: () => {
            if (options.onaction) {
              options.onaction();
            } else if (options.actionUrl && typeof window !== 'undefined') {
              window.location.href = options.actionUrl;
            }
          }
        }
      : undefined
  });
};
