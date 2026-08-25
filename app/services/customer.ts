import { and, eq } from 'drizzle-orm';
import { customers, db } from '@db';

/** Normalize a WhatsApp number to digits using the configured country code. */
export const normalizeWa = (raw: string, defaultCountryCode = '62'): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(defaultCountryCode)) return digits;
  if (digits.startsWith('0')) return `${defaultCountryCode}${digits.slice(1)}`;
  if (defaultCountryCode === '62' && digits.startsWith('8')) return `62${digits}`;
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
  input: { name: string; wa: string; countryCode?: string }
) => {
  const wa = normalizeWa(input.wa, input.countryCode);
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
    .onConflictDoNothing({ target: [customers.workspaceId, customers.wa] })
    .returning();

  const resolved = created ?? (await findCustomerByWa(workspaceId, wa));
  if (!resolved) throw new Error('Customer gagal dibuat.');
  return resolved;
};
