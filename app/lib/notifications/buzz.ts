import { toast } from '$lib/components/molecules/index.js';
import { playNotificationSound } from './sound.js';


export type BuzzOptions = {
  senderName: string;
  note?: string;
  title?: string;
  actionUrl?: string;
  onaction?: () => void;
  sound?: boolean;
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
    navigator.vibrate(80);
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
