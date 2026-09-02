import { Module } from '@nestjs/common';
import { CsrfController } from './csrf.controller';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from './csrf.service';

/**
 * CsrfModule — proteksi CSRF global (double-submit cookie + HMAC).
 * EnvConfig global dari ConfigModule; EnvConfig/CsrfService di-inject ke guard.
 * SOLID: module ini cuma urus satu concern (CSRF).
 */
@Module({
  controllers: [CsrfController],
  providers: [CsrfService, CsrfGuard],
  exports: [CsrfService],
})
export class CsrfModule {}