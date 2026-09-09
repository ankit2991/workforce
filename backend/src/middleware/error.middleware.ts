import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('💥 Unhandled Error:', err);

  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation error', 'VALIDATION_ERROR', 400, errorDetails);
  }

  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';
  const status = err.statusCode || 500;

  return sendError(res, message, code, status);
};
