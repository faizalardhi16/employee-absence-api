import { Global, Module } from '@nestjs/common';
import { EnvConfig } from './env/env.config';

/**
 * ConfigModule — global provider untuk EnvConfig.
 * EnvConfig dibaca sekali (singleton, injected) dan dibagikan ke seluruh app.
 * SOLID SRP: modul ini cuma satu job — expose config yang sudah divalidasi.
 */
@Global()
@Module({
  providers: [
    {
      provide: EnvConfig,
      useFactory: (): EnvConfig => new EnvConfig(process.env),
    },
  ],
  exports: [EnvConfig],
})
export class ConfigModule {}
