import { SetMetadata } from '@nestjs/common';
import { SKIP_CSRF_KEY } from './csrf.constants';

/**
 * Tandai route untuk dilewati validasi CSRF.
 * Hati-hati: hanya boleh dipakai untuk endpoint yang memang harus bisa
 * dipanggil tanpa header CSRF (mis. webhook dari pihak ketiga).
 */
export const SkipCsrf = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_CSRF_KEY, true);