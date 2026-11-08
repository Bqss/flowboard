import type { ApiChatReceiptCursor, ChatMessageStatus } from '$lib/api/client.js';

export type ReceiptMessageRef = { senderId: string; createdAt: string };

export type ReceiptEntry = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  at: string | null;
};

export type ReceiptGroups = {
  read: ReceiptEntry[];
  delivered: ReceiptEntry[];
  pending: ReceiptEntry[];
};

const toMs = (value: string | null | undefined): number => {
  if (!value) return Number.NaN;
  return Date.parse(value);
};

/** Reached = cursor timestamp is at or after the message timestamp. */
const reached = (cursor: string | null, messageMs: number): boolean => {
  const ms = toMs(cursor);
  return !Number.isNaN(ms) && !Number.isNaN(messageMs) && ms >= messageMs;
};

/** Recipients relevant to a message: everyone except the sender who had joined by the time it was sent. */
const relevantCursors = (msg: ReceiptMessageRef, cursors: ApiChatReceiptCursor[]): ApiChatReceiptCursor[] => {
  const messageMs = toMs(msg.createdAt);
  return cursors.filter((c) => {
    if (c.userId === msg.senderId) return false;
    const joinedMs = toMs(c.joinedAt);
    if (Number.isNaN(joinedMs) || Number.isNaN(messageMs)) return true;
    return joinedMs <= messageMs;
  });
};

const isRead = (c: ApiChatReceiptCursor, messageMs: number) => reached(c.lastReadAt, messageMs);
const isDelivered = (c: ApiChatReceiptCursor, messageMs: number) =>
  isRead(c, messageMs) || reached(c.lastDeliveredAt, messageMs);

export const getMessageStatus = (
  msg: ReceiptMessageRef,
  cursors: ApiChatReceiptCursor[]
): ChatMessageStatus => {
  const relevant = relevantCursors(msg, cursors);
  if (relevant.length === 0) return 'sent';
  const messageMs = toMs(msg.createdAt);
  if (relevant.every((c) => isRead(c, messageMs))) return 'read';
  if (relevant.every((c) => isDelivered(c, messageMs))) return 'delivered';
  return 'sent';
};

const sortEntries = (entries: ReceiptEntry[]): ReceiptEntry[] =>
  entries.sort((a, b) => {
    const am = toMs(a.at);
    const bm = toMs(b.at);
    const av = Number.isNaN(am) ? -Infinity : am;
    const bv = Number.isNaN(bm) ? -Infinity : bm;
    if (av !== bv) return bv - av;
    return a.name.localeCompare(b.name, 'id');
  });

export const getMessageReceiptGroups = (
  msg: ReceiptMessageRef,
  cursors: ApiChatReceiptCursor[]
): ReceiptGroups => {
  const messageMs = toMs(msg.createdAt);
  const groups: ReceiptGroups = { read: [], delivered: [], pending: [] };
  for (const c of relevantCursors(msg, cursors)) {
    const base = { userId: c.userId, name: c.name, avatarUrl: c.avatarUrl };
    if (isRead(c, messageMs)) groups.read.push({ ...base, at: c.lastReadAt });
    else if (isDelivered(c, messageMs)) groups.delivered.push({ ...base, at: c.lastDeliveredAt });
    else groups.pending.push({ ...base, at: null });
  }
  sortEntries(groups.read);
  sortEntries(groups.delivered);
  sortEntries(groups.pending);
  return groups;
};

/** Returns the later of two timestamps (keeping the original string), never moving backwards. */
const maxTimestamp = (current: string | null, incoming: string | null | undefined): string | null => {
  if (!incoming) return current;
  const inMs = toMs(incoming);
  if (Number.isNaN(inMs)) return current;
  const curMs = toMs(current);
  if (Number.isNaN(curMs) || inMs > curMs) return incoming;
  return current;
};

export const applyReceiptEvent = (
  cursors: ApiChatReceiptCursor[],
  evt: { userId: string; deliveredAt?: string | null; readAt?: string | null }
): ApiChatReceiptCursor[] => {
  const index = cursors.findIndex((c) => c.userId === evt.userId);
  if (index === -1) return cursors;
  const current = cursors[index];
  const lastReadAt = maxTimestamp(current.lastReadAt, evt.readAt);
  // Reading implies delivery.
  const lastDeliveredAt = maxTimestamp(maxTimestamp(current.lastDeliveredAt, evt.deliveredAt), lastReadAt);
  if (lastReadAt === current.lastReadAt && lastDeliveredAt === current.lastDeliveredAt) return cursors;
  const next = cursors.slice();
  next[index] = { ...current, lastReadAt, lastDeliveredAt };
  return next;
};

/** Legacy `{ type: 'read' }` event carries no timestamp: treat it as read + delivered now. */
export const applyLegacyReadEvent = (cursors: ApiChatReceiptCursor[], userId: string): ApiChatReceiptCursor[] => {
  const now = new Date().toISOString();
  return applyReceiptEvent(cursors, { userId, readAt: now, deliveredAt: now });
};
