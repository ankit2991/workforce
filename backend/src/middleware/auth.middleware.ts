import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    mobile: string;
    employeeId?: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token required', 'UNAUTHENTICATED', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Fetch user and employee profile
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { employee: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return sendError(res, 'User not found or inactive', 'UNAUTHORIZED', 401);
    }

    req.user = {
      id: user.id,
      role: user.role,
      mobile: user.mobile,
      employeeId: user.employee?.id,
    };

    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 'TOKEN_EXPIRED', 401);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permissions', 'FORBIDDEN', 403);
    }
    next();
  };
};
