import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { EnvConfig } from '../config/env/env.config';
import { StorageProvider } from './storage-provider.interface';

/**
 * AlibabaS3Storage — implementasi StorageProvider untuk Alibaba Cloud OSS.
 * OSS kompatibel dengan S3 API, jadi pakai @aws-sdk/client-s3 dengan endpoint OSS.
 * SOLID: satu class satu tanggung jawab.
 */
@Injectable()
export class AlibabaS3Storage implements StorageProvider {
  readonly name = 'alibaba' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: EnvConfig) {
    this.bucket = config.aliS3Bucket;
    this.client = new S3Client({
      region: config.aliS3Region,
      endpoint: config.aliS3Endpoint || `https://${config.aliS3Region}.aliyuncs.com`,
      credentials: {
        accessKeyId: config.aliAccessKeyId,
        secretAccessKey: config.aliSecretAccessKey,
      },
      forcePathStyle: true, // OSS pakai path-style addressing
    });
  }

  async upload(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType ?? 'application/octet-stream',
      }),
    );
    return key;
  }

  async download(key: string): Promise<Buffer> {
    try {
      const resp = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return Buffer.from(await resp.Body!.transformToByteArray());
    } catch {
      throw new NotFoundException(`Object ${key} tidak ditemukan di Alibaba OSS`);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }
}
