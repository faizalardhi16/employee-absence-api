/** Injection token untuk Redis client. Dipisah dari module biar gak circular dependency. */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
