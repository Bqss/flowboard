import { processDueWhatsappJobs, processOverdueCardReminders } from './whatsapp';
import { processDigestEmails } from './notification-digest';
import {
  processDueSoonNotifications,
  processOverdueNotifications,
  processRecurringWorkflows
} from './workflow';

let interval: ReturnType<typeof setInterval> | null = null;
let digestInterval: ReturnType<typeof setInterval> | null = null;
let ticking = false;
let digestTicking = false;

export const schedulerTick = async () => {
  if (ticking) return;
  ticking = true;
  try {
    await processDueWhatsappJobs();
    await processOverdueCardReminders();
    await processDueSoonNotifications();
    await processOverdueNotifications();
    await processRecurringWorkflows();
  } catch (error) {
    console.error('[scheduler] tick failed:', error);
  } finally {
    ticking = false;
  }
};

export const digestTick = async () => {
  if (digestTicking) return;
  digestTicking = true;
  try {
    await processDigestEmails();
  } catch (error) {
    console.error('[scheduler] digest tick failed:', error);
  } finally {
    digestTicking = false;
  }
};

export const startScheduler = (intervalMs = 30_000, digestIntervalMs = 60 * 60 * 1000) => {
  if (interval) return;

  void schedulerTick();
  interval = setInterval(() => {
    void schedulerTick();
  }, intervalMs);

  // Digest email runs every hour (default) — separate cadence from the 30s WA scheduler.
  void digestTick();
  digestInterval = setInterval(() => {
    void digestTick();
  }, digestIntervalMs);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
  if (typeof digestInterval?.unref === 'function') {
    digestInterval.unref();
  }
};
