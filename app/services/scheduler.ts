import { env } from '@config/env';
import { processDueWhatsappJobs, processOverdueCardReminders } from './whatsapp';
import { processDigestEmails } from './notification-digest';
import {
  processDueSoonNotifications,
  processOverdueNotifications,
  processRecurringWorkflows
} from './workflow';
import { syncAllConnections as syncSheetsConnections } from './google-sheets';

let interval: ReturnType<typeof setInterval> | null = null;
let digestInterval: ReturnType<typeof setInterval> | null = null;
let sheetsInterval: ReturnType<typeof setInterval> | null = null;
let ticking = false;
let digestTicking = false;
let sheetsTicking = false;

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

export const sheetsTick = async () => {
  if (sheetsTicking) return;
  sheetsTicking = true;
  try {
    await syncSheetsConnections();
  } catch (error) {
    console.error('[scheduler] sheets tick failed:', error);
  } finally {
    sheetsTicking = false;
  }
};

export const startScheduler = (
  intervalMs = env.schedulerIntervalMs,
  digestIntervalMs = env.schedulerDigestIntervalMs,
  sheetsIntervalMs = env.schedulerSheetsIntervalMs
) => {
  if (interval) return;
  console.log(`[scheduler] starting — wa: ${intervalMs / 1000}s, digest: ${digestIntervalMs / 1000 / 60}m, sheets: ${sheetsIntervalMs / 1000}s`);

  void schedulerTick();
  interval = setInterval(() => {
    void schedulerTick();
  }, intervalMs);

  // Digest email runs every hour (default) — separate cadence from the 30s WA scheduler.
  void digestTick();
  digestInterval = setInterval(() => {
    void digestTick();
  }, digestIntervalMs);

  // Google Sheets polling — every 60s by default.
  void sheetsTick();
  sheetsInterval = setInterval(() => {
    void sheetsTick();
  }, sheetsIntervalMs);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
  if (typeof digestInterval?.unref === 'function') {
    digestInterval.unref();
  }
  if (typeof sheetsInterval?.unref === 'function') {
    sheetsInterval.unref();
  }
};

export const stopScheduler = () => {
  if (interval) { clearInterval(interval); interval = null; }
  if (digestInterval) { clearInterval(digestInterval); digestInterval = null; }
  if (sheetsInterval) { clearInterval(sheetsInterval); sheetsInterval = null; }
};
