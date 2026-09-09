import crypto from 'crypto';

export type RefPrefix = 'WDR' | 'ADV' | 'GAM' | 'ORD' | 'TX' | 'SHOP' | 'REMIT';

export function generateReference(prefix: RefPrefix): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `${prefix}-${dateStr}-${randomSuffix}`;
}
