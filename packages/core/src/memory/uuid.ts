import { randomBytes } from 'node:crypto';

/**
 * Generate a UUIDv7 (time-sortable UUID per RFC 9562).
 * Format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
 */
export function uuidv7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);

  // Timestamp (48 bits, milliseconds)
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Random bits
  const rand = randomBytes(10);
  for (let i = 0; i < 10; i++) {
    bytes[6 + i] = rand[i] ?? 0;
  }

  // Version 7
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  // Variant 10xx
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
