import { Global, Module } from '@nestjs/common';
import { EnvConfig } from '../config/env/env.config';
import { AlibabaS3Storage } from './alibaba-s3.storage';
import { AwsS3Storage } from './aws-s3.storage';
import { StorageProvider } from './storage-provider.interface';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/**
 * StorageModule — expose StorageProvider (abstraction S3).
 * Provider aktif dipilih via env STORAGE_PROVIDER: 'aws' | 'alibaba'.
 * SOLID (DIP): consumer inject StorageProvider, gak peduli AWS/OSS.
 */
@Global()
@Module({
  providers: [
    AwsS3Storage,
    AlibabaS3Storage,
    {
      provide: STORAGE_PROVIDER,
      inject: [EnvConfig, AwsS3Storage, AlibabaS3Storage],
      useFactory: (
        config: EnvConfig,
        aws: AwsS3Storage,
        alibaba: AlibabaS3Storage,
      ): StorageProvider => {
        return config.storageProvider === 'alibaba' ? alibaba : aws;
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
