import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * GlobalHttpExceptionFilter — format error response konsisten untuk semua HTTP error.
 * SOLID: cuma satu job (format error output). Dipakai app main.ts via useGlobalFilters.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        message = resp;
        error = exception.name;
      } else if (resp && typeof resp === 'object') {
        const r = resp as Record<string, unknown>;
        message = (r.message as string | string[]) ?? exception.message;
        error = (r.error as string) ?? exception.name;
      }
    } else if (exception instanceof Error) {
      // Log unexpected error, jangan expose detail ke client
      request?.log?.error?.(exception.message, exception.stack);
      message = 'Internal server error';
    }

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      path: request?.url ?? '',
      timestamp: new Date().toISOString(),
    };

    reply.status(status).send(body);
  }
}
