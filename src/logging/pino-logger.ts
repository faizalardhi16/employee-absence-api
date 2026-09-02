import { pino, Logger as PinoLoggerInstance, Level } from 'pino';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { EnvConfig } from '../config/env/env.config';

/** Pilihan target transport pino (file / pretty). */
type TransportTarget = {
  target: string;
  options?: Record<string, unknown>;
  level: Level;
};

/**
 * pino-logger.ts — factory PinoLogger.
 * SOLID (SRP): cuma satu job — bangun & return instance pino yang siap pakai,
 * berdasarkan config (env, level, sink file/console).
 *
 * Redaction: jangan pernah bocorin secret/sensitive ke log
 * (cookie access_token, authorization header, dll).
 */
export interface BuiltLogger {
  logger: PinoLoggerInstance;
  level: Level;
}

function resolvePrettyTransportPath(): string {
  const compiledPath = resolve(__dirname, 'pretty-transport.cjs');
  if (existsSync(compiledPath)) {
    return compiledPath;
  }

  return resolve(process.cwd(), 'src', 'logging', 'pretty-transport.cjs');
}

const SENSITIVE_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.access_token',
  '*.refresh_token',
];

export function buildPinoLogger(config: EnvConfig): BuiltLogger {
  const level: Level = (config.logLevel as Level) || (config.isProduction ? 'info' : 'debug');

  const transports: TransportTarget[] = [];

  // Sink file (selalu aktif di produksi; aktif juga di dev biar ada jejak)
  if (config.logDir) {
    mkdirSync(config.logDir, { recursive: true });
    transports.push(
      // Semua level -> app.log
      {
        target: 'pino/file',
        options: {
          destination: resolve(config.logDir, 'app.log'),
          mkdir: true,
        },
        level: 'debug',
      },
      // Hanya warn+error -> error.log (mudah cari masalah)
      {
        target: 'pino/file',
        options: {
          destination: resolve(config.logDir, 'error.log'),
          mkdir: true,
        },
        level: 'warn',
      },
    );
  }

  // Sink console warna di development (hijau=info, oren=debug, kuning=warn, merah=error),
  // JSON mentah di production
  if (!config.isProduction) {
    transports.push({
      target: resolvePrettyTransportPath(),
      level,
    });
  }

  const logger = pino({
    level,
    redact: { paths: SENSITIVE_PATHS, censor: '[REDACTED]' },
    base: {
      app: config.appName,
      env: config.nodeEnv,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(transports.length
      ? {
          transport: {
            targets: transports,
          },
        }
      : {}),
  });

  return { logger, level };
}
