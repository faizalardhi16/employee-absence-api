import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { EnvConfig } from '../../config/env/env.config';

/**
 * CsrfService — generate & verifikasi token CSRF (double-submit cookie).
 *
 * Token berbentuk `<random>.<signature>`:
 *  - random: 32 byte acak hex (dipakai sebagai nilai cookie + header)
 *  - signature: HMAC-SHA256(random, CSRF_SECRET)
 *
 * Signature menjaga validitas token meskipun attacker bisa men-set cookie
 * (mis. via subdomain): tanpa CSRF_SECRET, attacker tidak bisa memalsukan
 * signature. SOLID: service cuma urus kriptografi token.
 */
@Injectable()
export class CsrfService {
  constructor(private readonly config: EnvConfig) {}

  /** Generate token CSRF baru: random hex + HMAC signature. */
  generateToken(): string {
    const random = randomBytes(32).toString('hex');
    return `${random}.${this.sign(random)}`;
  }

  /**
   * Verifikasi token: format harus benar DAN signature harus valid.
   * Perbandingan signature memakai timing-safe comparison.
   */
  verifyToken(token: string | undefined | null): boolean {
    if (typeof token !== 'string' || token.length === 0) return false;

    const separator = token.lastIndexOf('.');
    if (separator <= 0 || separator === token.length - 1) return false;

    const random = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    const expected = this.sign(random);

    const actual = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    return actual.length === wanted.length && timingSafeEqual(actual, wanted);
  }

  private sign(random: string): string {
    return createHmac('sha256', this.config.csrfSecret)
      .update(random)
      .digest('hex');
  }
}