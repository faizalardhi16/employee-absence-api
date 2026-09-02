/**
 * StorageProvider — kontrak abstraction untuk object storage (S3).
 * SOLID (DIP): business logic bergantung pada interface ini, bukan implementasi S3 spesifik.
 * Implementasi: AwsS3Storage (AWS) & AlibabaS3Storage (Alibaba OSS).
 */
export interface StorageProvider {
  readonly name: 'aws' | 'alibaba';

  /** Upload buffer -> object di bucket. Return public key/path. */
  upload(key: string, body: Buffer | Uint8Array, contentType?: string): Promise<string>;

  /** Download object -> Buffer. Throw kalau tidak ada. */
  download(key: string): Promise<Buffer>;

  /** Delete object. */
  delete(key: string): Promise<void>;

  /** Cek apakah object ada. */
  exists(key: string): Promise<boolean>;

  /** Generate presigned GET URL (expired dalam detik). */
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
}
