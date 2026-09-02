# NestJS Fastify Skeleton

Backend starter **NestJS + Fastify** dengan **SOLID principle + Clean Architecture**.
Sudah dibundel setup lengkap untuk langsung dipakai produksi.

## Fitur (sesuai spec)

1. ✅ **NestJS + Fastify adapter** — `@nestjs/platform-fastify` (lebih cepat dari Express)
2. ✅ **Swagger** — auto docs di `/docs`
3. ✅ **Auth cookie** — JWT disimpan di HttpOnly cookie (bukan localStorage)
4. ✅ **Logging proper** — pino structured (file `app.log`/`error.log` + console pretty) + HttpLoggingInterceptor + global error filter
5. ✅ **TypeORM** — PostgreSQL (entitas di `src/database/entities/`)
6. ✅ **`.env` + ConfigService** — `EnvConfig` singleton (SOLID SRP)
7. ✅ **Dockerfile** — multistage, non-root, production-ready
8. ✅ **MongoDB logging** — pencatatan log ke MongoDB (collection terpisah)
9. ✅ **Redis cache** — koneksi + service cache abstraction
10. ✅ **S3 AWS + Alibaba** — StorageProvider interface, pilih via env
11. ✅ **SWC compiler** — build 10-20x lebih cepat
12. ✅ **Timeout + retry + DDoS + throttle** — rate-limit per IP, request timeout

## Teknologi

- **Runtime**: Node 22, TypeScript, SWC (Rust compiler)
- **Framework**: NestJS 10 + Fastify 4
- **ORM**: TypeORM (PostgreSQL via `pg`)
- **Cache**: Redis (ioredis)
- **Logging**: pino (structured, file + console) + MongoDB sink (mongoose)
- **Storage**: AWS S3 SDK + Alibaba OSS (S3-compatible)
- **Auth**: JWT + cookie (passport-jwt + @fastify/cookie)
- **Security**: @fastify/helmet + @fastify/rate-limit (DDoS protection)

## Setup

```bash
# 1. Install
npm install

# 2. Konfigurasi
cp .env.example .env   # isi kredensial (DB, Mongo, Redis, S3)

# 3. Jalankan (SWC — cepat)
npm run start:dev       # development (watch)
npm run build           # production build (SWC)
npm run start:prod      # jalanin hasil build

# 4. Type check (SWC gak type-check, jalankan terpisah)
npm run typecheck

# 5. Lint
npm run lint
```

## Logging (pino)

Logger terstruktur berbasis **pino** — standard NestJS + Fastify.

- **Sink output**:
  - `logs/app.log` — semua level (debug ke atas)
  - `logs/error.log` — hanya warn + error (mudah cari masalah)
  - console berwarna di development (ANSI 256):
    - `INFO` → **hijau**
    - `DEBUG` → **oranye**
    - `WARN` → **kuning**
    - `ERROR` → **merah**
    (custom transport `src/logging/pretty-transport.cjs`, karena pino-pretty
    bawaan tidak mendukung warna oranye)
- **Fastify request log** — ter-set ke pino yang sama, jadi incoming/outgoing request
  juga tercatat (reqId, method, url, status, responseTime).
- **`AppLoggerService`** — implementasi `LoggerService` NestJS, injectable di semua
  service/module. Punya `.child(context)` biar tiap module punya context sendiri.
- **`HttpLoggingInterceptor`** — log per-request structured (method, url, status,
  durationMs, ip, userAgent). Didaftarkan via `APP_INTERCEPTOR`.
- **Redaction** — field sensitif (`authorization`, `cookie`, `password`, `token`,
  `secret`, `apiKey`) otomatis di-`[REDACTED]` supaya gak bocor ke log/file.
- **MongoDB sink** — `MongoLogService` (collection `logs`) sebagai sink opsional,
  fire-and-forget. Kalau Mongo offline, app tetap jalan (graceful / degraded).
- **Graceful degradation** — Redis/Mongo gak tersedia gak akan crash app; cukup tercatat
  sebagai warning di log.

Contoh pemakaian di service:

```ts
import { AppLoggerService } from '../../logging/app-logger.service';

@Injectable()
export class FooService {
  private readonly logger: AppLoggerService;
  constructor(appLogger: AppLoggerService) {
    this.logger = appLogger.child(FooService.name);
  }
  doSomething() {
    this.logger.info('halo', undefined, { some: 'meta' });
  }
}
```

## Struktur (Clean Architecture + SOLID)

```
src/
├── main.ts                      # Bootstrap (Fastify, Swagger, helmet, rate-limit, cookie)
├── app.module.ts                # Composition root (wiring semua module)
├── config/                      # Config layer (EnvConfig singleton)
│   ├── config.module.ts
│   └── env/env.config.ts        # Single source of truth config
├── common/                      # Cross-cutting concerns
│   ├── filters/                 # Global error filter
│   └── interceptors/            # Transform (envelope) + Logging
├── database/                    # TypeORM + PostgreSQL
│   ├── database.module.ts
│   ├── data-source.ts           # DataSource untuk TypeORM CLI (migrasi)
│   ├── entities/                # Definisi entitas (UAR_*, datastore_records)
│   ├── migrations/              # Migrasi TypeORM (idempotent)
│   └── seed/seed.sql            # Seed RBAC + bootstrap admin (idempotent)
├── logging/                     # Logging: pino structured + MongoDB sink
│   ├── logging.module.ts        #   module (global), provide pino + AppLoggerService
│   ├── app-logger.service.ts    #   LoggerService NestJS berbasis pino
│   ├── pino-logger.ts           #   factory pino (file + console + redaction)
│   ├── pretty-transport.cjs     #   transport console custom (warna per level)
│   ├── logger.constants.ts      #   injection tokens
│   └── mongo-log.service.ts     #   sink opsional ke MongoDB
├── redis/                       # Redis cache
│   ├── redis.module.ts
│   └── redis-cache.service.ts
├── storage/                     # S3 abstraction (DIP)
│   ├── storage-provider.interface.ts
│   ├── aws-s3.storage.ts
│   ├── alibaba-s3.storage.ts
│   └── storage.module.ts
├── types/                       # Type augmentation (fastify cookie)
└── modules/                     # Feature modules
    ├── auth/                    # JWT + cookie auth
    │   ├── controller / service / module
    │   ├── strategies/          # JwtStrategy
    │   ├── guards/              # JwtAuthGuard
    │   └── decorators/          # @Public, @CurrentUser
    ├── health/                  # /health endpoint
    └── data/                    # CRUD demo: MongoDB / Redis / PostgreSQL
        ├── data.module.ts
        ├── data.controller.ts   # POST/GET /api/data/{mongo,redis,postgres}
        ├── mongo-data.service.ts
        ├── redis-data.service.ts
        ├── pg-data.service.ts
        └── dto/create-item.dto.ts
```

## API

| Endpoint | Auth | Fungsi |
|----------|------|--------|
| `GET /api/health` | Public | Health check semua dependensi |
| `POST /api/auth/login` | Public | Login, set cookie |
| `POST /api/auth/logout` | Public | Hapus cookie |
| `GET /api/auth/me` | JWT | Profil user dari cookie |
| `POST /api/data/mongo` | JWT | Create item ke MongoDB |
| `GET /api/data/mongo/:key` | JWT | Get item MongoDB by key |
| `POST /api/data/redis` | JWT | Create item ke Redis |
| `GET /api/data/redis/:key` | JWT | Get item Redis by key |
| `POST /api/data/postgres` | JWT | Create item ke PostgreSQL |
| `GET /api/data/postgres/:key` | JWT | Get item PostgreSQL by key |

Swagger UI: **`/docs`**

### Data Store (Mongo / Redis / PostgreSQL)

Contoh body untuk semua endpoint `POST /api/data/*`:

```json
{
  "key": "barang-demo-1",
  "value": "Data PostgreSQL pertama",
  "meta": { "source": "test", "n": 1 }
}
```

- **`item_key`** unik per store — create ulang dengan key sama akan menolak (PG) / unik constraint (Mongo).
- **MongoDB** → collection `datastore_items` di db `MONGO_DB`.
- **Redis** → key `cache:data:<key>` (TTL 0 = permanen, sampai di-del manual).
- **PostgreSQL** → tabel `datastore_records` (via TypeORM).

> Endpoint ini butuh **auth** (`GET /api/auth/login` → cookie JWT).

## Konfigurasi env penting

```bash
PORT=3000
APP_PREFIX=api
JWT_SECRET=...            # ganti di produksi!
COOKIE_SECURE=true        # wajib true di HTTPS/produksi
STORAGE_PROVIDER=aws      # 'aws' | 'alibaba'
# MongoDB wajib memuat kredensial jika authentication aktif:
MONGO_URL=mongodb://mongo_user:mongo_password@localhost:27017/nest_fastify_logs?authSource=admin
MONGO_DB=nest_fastify_logs
```

Jika muncul `Command insert requires authentication`, ubah `MONGO_URL` di `.env`
dengan username, password, host, port, dan `authSource` MongoDB yang benar.
`authSource` adalah database tempat user MongoDB dibuat, biasanya `admin`.

## Docker

```bash
docker build -t nest-fastify-skeleton .
docker run -p 3100:3100 --env-file .env nest-fastify-skeleton
```

## Catatan SWC

SWC **tidak melakukan type-check** (biar cepat). Type error tidak memblokir build.
Selalu jalankan `npm run typecheck` (tsc --noEmit) sebagai gate terpisah di CI/deploy.

## TypeORM (migrasi)

```bash
npm run migration:run        # apply migrasi ke DB (baca .env)
npm run migration:generate -- src/database/migrations/NamaMigrasi
npm run migration:revert     # rollback migrasi terakhir
```

Seed awal (role + permission + admin bootstrap) — idempotent:

```bash
psql -U <user> -d <db> -f src/database/seed/seed.sql
```

Aktivasi **Developer Mode** per user (memunculkan inspektor Request/Response Log di UI):

```sql
UPDATE "UAR_USERS" SET "DEVELOPER_MODE" = true WHERE "EMAIL" = 'admin@example.com';
```
