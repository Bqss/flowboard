import { and, eq } from 'drizzle-orm';
import { customers, db } from '@db';

/** Normalize WhatsApp number to digits; Indonesian 08… → 628… */
export const normalizeWa = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
};

export const findCustomerByWa = async (workspaceId: string, wa: string) => {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.workspaceId, workspaceId), eq(customers.wa, wa)))
    .limit(1);

  return row ?? null;
};

export const findOrCreateCustomer = async (
  workspaceId: string,
  input: { name: string; wa: string }
) => {
  const wa = normalizeWa(input.wa);
  if (!wa) {
    throw new Error('Nomor WhatsApp tidak valid.');
  }

  const existing = await findCustomerByWa(workspaceId, wa);
  if (existing) {
    if (existing.name.trim() !== input.name.trim()) {
      const [updated] = await db
        .update(customers)
        .set({ name: input.name.trim(), updatedAt: new Date() })
        .where(eq(customers.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db
    .insert(customers)
    .values({
      workspaceId,
      name: input.name.trim(),
      wa
    })
    .returning();

  return created;
};
