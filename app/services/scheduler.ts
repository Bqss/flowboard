import { processDueWhatsappJobs, processOverdueCardReminders } from './whatsapp';

let interval: ReturnType<typeof setInterval> | null = null;
let ticking = false;

export const schedulerTick = async () => {
  if (ticking) return;
  ticking = true;
  try {
    await processDueWhatsappJobs();
    await processOverdueCardReminders();
  } catch (error) {
    console.error('[scheduler] tick failed:', error);
  } finally {
    ticking = false;
  }
};

export const startScheduler = (intervalMs = 30_000) => {
  if (interval) return;

  void schedulerTick();
  interval = setInterval(() => {
    void schedulerTick();
  }, intervalMs);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
};
