import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 does not automatically forward rejected async route promises.
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => (req, res, next) => {
  Promise.resolve().then(() => fn(req, res, next)).catch(next);
};
