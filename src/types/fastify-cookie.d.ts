import 'fastify';

/**
 * Type augmentation untuk @fastify/cookie.
 * FastifyRequest jadi punya .cookies, FastifyReply punya .setCookie/.clearCookie.
 */
declare module 'fastify' {
  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
  }

  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: Record<string, unknown>,
    ): this;
    clearCookie(name: string, options?: Record<string, unknown>): this;
  }
}
