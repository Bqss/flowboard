export const DEFAULT_TASK_REMINDER_HOURS = 2;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export const isWithinTaskReminderWindow = (
  dueAt: Date,
  now: Date,
  reminderHours?: number | null
): boolean => {
  const timeUntilDue = dueAt.getTime() - now.getTime();
  const reminderWindow = (reminderHours ?? DEFAULT_TASK_REMINDER_HOURS) * MILLISECONDS_PER_HOUR;

  return timeUntilDue > 0 && timeUntilDue <= reminderWindow;
};
