import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Log details on the server, never reveal Mongo connection info to clients.
  console.error('[api] request failure', err);

  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
    return sendError(res, 'Validation error', 'VALIDATION_ERROR', 400, details);
  }
  const prismaFailure = typeof err?.name === 'string' && err.name.startsWith('PrismaClient');
  if (prismaFailure || /^P10\d\d$/.test(String(err?.code || ''))) {
    return sendError(res, 'Database temporarily unavailable', 'DATABASE_UNAVAILABLE', 503);
  }
  return sendError(res, 'Internal Server Error', 'INTERNAL_ERROR', 500);
};
