/**
 * EnvConfig — single source of truth untuk semua config environment.
 * Dipakai ConfigModule via useFactory. SOLID: satu concern per getter.
 */
export class EnvConfig {
  // App
  readonly nodeEnv: string;
  readonly port: number;
  readonly appName: string;
  readonly prefix: string;

  // Logging
  readonly logLevel: string;
  readonly logDir: string;

  // Auth / Cookie
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly cookieName: string;
  readonly cookieSecure: boolean;
  readonly cookieHttpOnly: boolean;
  readonly cookieSameSite: 'lax' | 'strict' | 'none';

  // CSRF (double-submit cookie + HMAC signature)
  readonly csrfSecret: string;
  readonly csrfCookieName: string;
  readonly csrfHeaderName: string;

  // PostgreSQL (TypeORM)
  readonly dbHost: string;
  readonly dbPort: number;
  readonly dbUser: string;
  readonly dbPassword: string;
  readonly dbName: string;
  readonly dbSsl: boolean;

  // MongoDB (logging)
  readonly mongoUrl: string;
  readonly mongoDb: string;
  readonly mongoLogCollection: string;

  // Redis (cache)
  readonly redisHost: string;
  readonly redisPort: number;
  readonly redisPassword: string;
  readonly redisDb: number;
  readonly redisPrefix: string;
  readonly redisTtl: number;

  // S3 — AWS
  readonly awsS3Region: string;
  readonly awsS3Bucket: string;
  readonly awsS3Endpoint: string;
  readonly awsAccessKeyId: string;
  readonly awsSecretAccessKey: string;

  // S3 — Alibaba
  readonly aliS3Region: string;
  readonly aliS3Bucket: string;
  readonly aliS3Endpoint: string;
  readonly aliAccessKeyId: string;
  readonly aliSecretAccessKey: string;

  // Active storage provider
  readonly storageProvider: 'aws' | 'alibaba';

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.nodeEnv = env.NODE_ENV ?? 'development';
    this.port = Number(env.PORT ?? 3000);
    this.appName = env.APP_NAME ?? 'nest-fastify-skeleton';
    this.prefix = env.APP_PREFIX ?? 'api';

    this.logLevel = env.LOG_LEVEL ?? 'debug';
    this.logDir = env.LOG_DIR ?? 'logs';

    this.jwtSecret = env.JWT_SECRET ?? 'change-me-in-production';
    this.jwtExpiresIn = env.JWT_EXPIRES_IN ?? '7d';
    this.cookieName = env.COOKIE_NAME ?? 'access_token';
    this.cookieSecure = env.COOKIE_SECURE === 'true';
    this.cookieHttpOnly = env.COOKIE_HTTP_ONLY === 'true';
    this.cookieSameSite = (env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') ?? 'lax';

    this.csrfSecret = env.CSRF_SECRET ?? 'change-me-in-production';
    this.csrfCookieName = env.CSRF_COOKIE_NAME ?? 'csrf_token';
    this.csrfHeaderName = env.CSRF_HEADER_NAME ?? 'x-csrf-token';

    this.dbHost = env.DB_HOST ?? 'localhost';
    this.dbPort = Number(env.DB_PORT ?? 5432);
    this.dbUser = env.DB_USER ?? 'postgres';
    this.dbPassword = env.DB_PASSWORD ?? 'postgres';
    this.dbName = env.DB_NAME ?? 'nest_fastify';
    this.dbSsl = env.DB_SSL === 'true';

    this.mongoUrl = env.MONGO_URL ?? 'mongodb://localhost:27017';
    this.mongoDb = env.MONGO_DB ?? 'nest_fastify_logs';
    this.mongoLogCollection = env.MONGO_LOG_COLLECTION ?? 'logs';

    this.redisHost = env.REDIS_HOST ?? 'localhost';
    this.redisPort = Number(env.REDIS_PORT ?? 6379);
    this.redisPassword = env.REDIS_PASSWORD ?? '';
    this.redisDb = Number(env.REDIS_DB ?? 0);
    this.redisPrefix = env.REDIS_PREFIX ?? 'cache:';
    this.redisTtl = Number(env.REDIS_TTL ?? 60);

    this.awsS3Region = env.AWS_S3_REGION ?? 'ap-southeast-1';
    this.awsS3Bucket = env.AWS_S3_BUCKET ?? 'your-bucket';
    this.awsS3Endpoint = env.AWS_S3_ENDPOINT ?? '';
    this.awsAccessKeyId = env.AWS_ACCESS_KEY_ID ?? '';
    this.awsSecretAccessKey = env.AWS_SECRET_ACCESS_KEY ?? '';

    this.aliS3Region = env.ALI_S3_REGION ?? 'oss-ap-southeast-1';
    this.aliS3Bucket = env.ALI_S3_BUCKET ?? 'your-bucket';
    this.aliS3Endpoint = env.ALI_S3_ENDPOINT ?? '';
    this.aliAccessKeyId = env.ALI_ACCESS_KEY_ID ?? '';
    this.aliSecretAccessKey = env.ALI_SECRET_ACCESS_KEY ?? '';

    this.storageProvider = (env.STORAGE_PROVIDER as 'aws' | 'alibaba') ?? 'aws';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
