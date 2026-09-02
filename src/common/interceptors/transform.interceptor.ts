import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface Envelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * TransformInterceptor — bungkus response jadi envelope seragam: { success, data, timestamp }.
 * SOLID: presentasi (response shape) terpisah dari business logic.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<Envelope<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
