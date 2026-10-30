import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type TaskNotificationData = {
  recipientName: string;
  taskTitle: string;
  taskDescription?: string | null;
  boardName: string;
  columnName: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  dueAt: Date;
  timeRemaining?: string;
  overdueDuration?: string;
  creatorName: string;
  assigneeName: string;
  taskUrl: string;
  workspaceName: string;
  appUrl?: string;
  notificationSettingsUrl?: string;
  logoUrl?: string;
};

export type RenderedEmail = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

const TEMPLATE_DIR = resolve(process.cwd(), 'app/resources/notifications/templates');

/**
 * Escapes characters for safe inclusion in HTML.
 */
export const escapeHtml = (text: string | null | undefined): string => {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Formats a date into a clean Indonesian locale string.
 * Example: "Jumat, 31 Okt 2026, 17:00 WIB"
 */
export const formatDueDateIndonesian = (date: Date): string => {
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const d = new Date(date);
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dayName}, ${day} ${month} ${year}, ${hours}:${minutes} WIB`;
};

/**
 * Formats remaining duration before a deadline.
 * Example: "24 jam lagi", "3 jam lagi", "45 menit lagi"
 */
export const formatTimeRemaining = (dueAt: Date, now = new Date()): string => {
  const diffMs = dueAt.getTime() - now.getTime();
  if (diffMs <= 0) return 'sekarang';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) {
    return `${diffDays} hari lagi`;
  }
  if (diffDays === 1) {
    return '1 hari lagi';
  }
  if (diffHours >= 1) {
    return `${diffHours} jam lagi`;
  }
  return `${Math.max(1, diffMinutes)} menit lagi`;
};

/**
 * Formats duration since a task became overdue.
 * Example: "2 jam yang lalu", "1 hari yang lalu"
 */
export const formatOverdueDuration = (dueAt: Date, now = new Date()): string => {
  const diffMs = now.getTime() - dueAt.getTime();
  if (diffMs <= 0) return 'baru saja';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return `${diffDays} hari yang lalu`;
  }
  if (diffHours >= 1) {
    return `${diffHours} jam yang lalu`;
  }
  return `${Math.max(1, diffMinutes)} menit yang lalu`;
};

/**
 * Maps raw priority key to an Indonesian display label.
 */
export const formatPriorityLabel = (priority?: string): string => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'Mendesak';
    case 'high':
      return 'Tinggi';
    case 'low':
      return 'Rendah';
    case 'medium':
    default:
      return 'Sedang';
  }
};

/**
 * Replaces named placeholders without interpreting `$` sequences in values.
 */
export const compileTemplate = (templateString: string, variables: Record<string, string>): string =>
  templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => variables[key] ?? '');

const loadTemplate = (filename: string): string => {
  const path = resolve(TEMPLATE_DIR, filename);
  return readFileSync(path, 'utf8');
};

const limitSubject = (prefix: string, title: string, maxLength = 45): string => {
  const available = Math.max(0, maxLength - prefix.length);
  if (title.length <= available) return `${prefix}${title}`;
  if (available <= 1) return `${prefix}${title.slice(0, available)}`;
  return `${prefix}${title.slice(0, available - 1).trimEnd()}…`;
};

const getEmailLinks = (data: TaskNotificationData) => {
  const appUrl = data.appUrl?.replace(/\/$/, '') ?? '';
  return {
    appUrl,
    logoUrl: data.logoUrl ?? (appUrl ? `${appUrl}/logo_clean.png` : ''),
    notificationSettingsUrl:
      data.notificationSettingsUrl ?? (appUrl ? `${appUrl}/dashboard/settings/notifications` : '')
  };
};

let dueReminderTemplateCache: string | null = null;
let overdueTemplateCache: string | null = null;

/**
 * Renders the Task Due Reminder Email (H-X hours before deadline).
 */
export const renderTaskDueReminderEmail = (data: TaskNotificationData): RenderedEmail => {
  if (!dueReminderTemplateCache) {
    dueReminderTemplateCache = loadTemplate('task-due-reminder.html');
  }

  const dueAtFormatted = formatDueDateIndonesian(data.dueAt);
  const timeRemaining = data.timeRemaining ?? formatTimeRemaining(data.dueAt);
  const priorityLabel = formatPriorityLabel(data.priority);
  const links = getEmailLinks(data);

  const subject = limitSubject(`Tenggat ${timeRemaining}: `, data.taskTitle);
  const preheader = `${data.boardName} · PIC: ${data.assigneeName || 'Belum ditugaskan'} · Tenggat ${dueAtFormatted}`.slice(0, 90);

  const taskDescriptionBlock = data.taskDescription?.trim()
    ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.5;font-weight:500;color:#334155;white-space:pre-line;">${escapeHtml(
        data.taskDescription
      )}</p>`
    : '';

  const variables: Record<string, string> = {
    taskTitle: escapeHtml(data.taskTitle),
    taskDescriptionBlock,
    boardName: escapeHtml(data.boardName),
    columnName: escapeHtml(data.columnName),
    priority: priorityLabel,
    dueAtFormatted: escapeHtml(dueAtFormatted),
    timeRemaining: escapeHtml(timeRemaining),
    recipientName: escapeHtml(data.recipientName),
    assigneeName: escapeHtml(data.assigneeName || 'Belum ditugaskan'),
    creatorName: escapeHtml(data.creatorName || 'Sistem'),
    taskUrl: escapeHtml(data.taskUrl),
    workspaceName: escapeHtml(data.workspaceName),
    appUrl: escapeHtml(links.appUrl),
    logoUrl: escapeHtml(links.logoUrl),
    notificationSettingsUrl: escapeHtml(links.notificationSettingsUrl)
  };

  const html = compileTemplate(dueReminderTemplateCache, variables);

  const text = [
    `Pengingat tenggat tugas | Actjom`,
    `Halo ${data.recipientName},`,
    ``,
    `Tugas ini jatuh tempo ${timeRemaining}.`,
    `Tugas: ${data.taskTitle}`,
    data.taskDescription ? `Deskripsi: ${data.taskDescription}` : '',
    `Board: ${data.boardName} / ${data.columnName}`,
    `Jatuh tempo: ${dueAtFormatted}`,
    `PIC: ${data.assigneeName || 'Belum ditugaskan'}`,
    `Dibuat oleh: ${data.creatorName || 'Sistem'}`,
    ``,
    `Buka tugas di Actjom: ${data.taskUrl}`
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, preheader, html, text };
};

/**
 * Renders the Task Overdue Alert Email (sent once when past deadline).
 */
export const renderTaskOverdueEmail = (data: TaskNotificationData): RenderedEmail => {
  if (!overdueTemplateCache) {
    overdueTemplateCache = loadTemplate('task-overdue.html');
  }

  const dueAtFormatted = formatDueDateIndonesian(data.dueAt);
  const overdueDuration = data.overdueDuration ?? formatOverdueDuration(data.dueAt);
  const priorityLabel = formatPriorityLabel(data.priority);
  const links = getEmailLinks(data);

  const subject = limitSubject('Tugas terlambat: ', data.taskTitle);
  const preheader = `${data.boardName} · PIC: ${data.assigneeName || 'Belum ditugaskan'} · Tenggat lewat ${overdueDuration}`.slice(
    0,
    90
  );

  const taskDescriptionBlock = data.taskDescription?.trim()
    ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.5;font-weight:500;color:#334155;white-space:pre-line;">${escapeHtml(
        data.taskDescription
      )}</p>`
    : '';

  const variables: Record<string, string> = {
    taskTitle: escapeHtml(data.taskTitle),
    taskDescriptionBlock,
    boardName: escapeHtml(data.boardName),
    columnName: escapeHtml(data.columnName),
    priority: priorityLabel,
    dueAtFormatted: escapeHtml(dueAtFormatted),
    overdueDuration: escapeHtml(overdueDuration),
    recipientName: escapeHtml(data.recipientName),
    assigneeName: escapeHtml(data.assigneeName || 'Belum ditugaskan'),
    creatorName: escapeHtml(data.creatorName || 'Sistem'),
    taskUrl: escapeHtml(data.taskUrl),
    workspaceName: escapeHtml(data.workspaceName),
    appUrl: escapeHtml(links.appUrl),
    logoUrl: escapeHtml(links.logoUrl),
    notificationSettingsUrl: escapeHtml(links.notificationSettingsUrl)
  };

  const html = compileTemplate(overdueTemplateCache, variables);

  const text = [
    `Pemberitahuan tugas terlambat | Actjom`,
    `Halo ${data.recipientName},`,
    ``,
    `Tugas ini melewati tenggat ${overdueDuration}.`,
    `Tugas: ${data.taskTitle}`,
    data.taskDescription ? `Deskripsi: ${data.taskDescription}` : '',
    `Board: ${data.boardName} / ${data.columnName}`,
    `Tenggat awal: ${dueAtFormatted}`,
    `PIC: ${data.assigneeName || 'Belum ditugaskan'}`,
    `Dibuat oleh: ${data.creatorName || 'Sistem'}`,
    ``,
    `Tinjau tugas di Actjom: ${data.taskUrl}`
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, preheader, html, text };
};
