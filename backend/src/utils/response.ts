import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message: string = 'Success',
  statusCode: number = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  code: string = 'ERROR',
  statusCode: number = 400,
  details?: any,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details ? { details } : {}),
  });
};
