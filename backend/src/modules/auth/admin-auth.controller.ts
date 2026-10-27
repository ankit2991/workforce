import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { generateAccessToken } from '../../utils/jwt';
import { sendError, sendSuccess } from '../../utils/response';

const adminLoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
}).strict();

// Admin users must be provisioned by the operator with a bcrypt hash.
// A public user cannot become an administrator by using a demo token.
export async function loginAdmin(req: Request, res: Response) {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Valid email and password required', 'VALIDATION_ERROR', 400);

  const email = parsed.data.email.toLowerCase();
  const admin = await prisma.user.findUnique({ where: { email } });
  const allowed = admin?.status === 'ACTIVE' && (admin.role === 'ADMIN' || admin.role === 'SUPER_ADMIN');
  // Always compare against a bcrypt hash, including when no admin matches.
  const fallbackHash = '$2b$10$guyq4r0Dixddpff0eeQbmego6x/k1iXgIrDU9GngCrZ9TXqXV5q7K';
  const validPassword = await bcrypt.compare(parsed.data.password, allowed && admin?.passwordHash ? admin.passwordHash : fallbackHash);
  if (!allowed || !admin?.passwordHash || !validPassword) {
    return sendError(res, 'Invalid administrator credentials', 'INVALID_CREDENTIALS', 401);
  }

  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, {
    accessToken: generateAccessToken({ userId: admin.id, role: admin.role, mobile: admin.mobile }),
    tokenType: 'Bearer',
    user: { id: admin.id, email: admin.email, role: admin.role },
  }, 'Administrator signed in');
}
