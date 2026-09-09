import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { z } from 'zod';

const sendOtpSchema = z.object({
  mobile: z.string().min(8, 'Valid mobile number required'),
});

const verifyOtpSchema = z.object({
  mobile: z.string().min(8, 'Valid mobile number required'),
  otp: z.string().length(6, '6-digit OTP code required'),
});

export const sendOtp = async (req: Request, res: Response) => {
  const { mobile } = sendOtpSchema.parse(req.body);

  // In development, OTP is always 123456
  return sendSuccess(res, {
    mobile,
    expiresInSeconds: 300,
    devOtp: process.env.NODE_ENV !== 'production' ? '123456' : undefined,
  }, 'OTP sent successfully to your mobile number');
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { mobile, otp } = verifyOtpSchema.parse(req.body);

  // Validate OTP (dev OTP is 123456)
  if (otp !== '123456') {
    return sendError(res, 'Invalid OTP code. Please try again.', 'INVALID_OTP', 400);
  }

  // Find user by mobile or create default
  let user = await prisma.user.findUnique({
    where: { mobile },
    include: { employee: true, wallet: true, gamingWallet: true },
  });

  if (!user) {
    // Auto-provision user, employee & wallets
    const defaultCompany = await prisma.company.findFirst() || await prisma.company.create({
      data: { name: 'Apex Workforce Global', code: 'CMP-001' },
    });

    const userCount = await prisma.user.count();
    const empCode = `EMP${String(userCount + 1).padStart(3, '0')}`;

    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          mobile,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
        },
      });

      const newEmp = await tx.employee.create({
        data: {
          userId: newUser.id,
          companyId: defaultCompany.id,
          employeeCode: empCode,
          firstName: 'Workforce',
          lastName: 'User',
          monthlySalary: 1500.0,
          status: 'ACTIVE',
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
          employeeId: newEmp.id,
          currency: 'MYR',
          availableBalance: 1200.0,
          totalEarned: 0.0,
          totalAdvance: 1500.0,
          totalWithdrawn: 300.0,
        },
      });

      await tx.gamingWallet.create({
        data: {
          userId: newUser.id,
          employeeId: newEmp.id,
          currency: 'MYR',
          balance: 0.0,
        },
      });

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: { employee: true, wallet: true, gamingWallet: true },
      });
    });
  }

  if (!user || user.status !== 'ACTIVE') {
    return sendError(res, 'Account is suspended or inactive', 'ACCOUNT_INACTIVE', 403);
  }

  const tokenPayload = {
    userId: user.id,
    role: user.role,
    mobile: user.mobile,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return sendSuccess(res, {
    user: {
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      employee: user.employee ? {
        id: user.employee.id,
        employeeCode: user.employee.employeeCode,
        firstName: user.employee.firstName,
        lastName: user.employee.lastName,
        monthlySalary: Number(user.employee.monthlySalary),
        department: user.employee.department,
        designation: user.employee.designation,
        profileImage: user.employee.profileImage,
      } : null,
      wallet: user.wallet ? {
        currency: user.wallet.currency,
        availableBalance: Number(user.wallet.availableBalance),
        totalEarned: Number(user.wallet.totalEarned),
        totalAdvance: Number(user.wallet.totalAdvance),
        totalWithdrawn: Number(user.wallet.totalWithdrawn),
      } : null,
      gamingWallet: user.gamingWallet ? {
        currency: user.gamingWallet.currency,
        balance: Number(user.gamingWallet.balance),
      } : null,
    },
    tokens: {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
    },
  }, 'Authenticated successfully');
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    return sendError(res, 'Refresh token is required', 'MISSING_TOKEN', 400);
  }

  try {
    const payload = verifyRefreshToken(token);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      return sendError(res, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', 401);
    }

    const tokenPayload = {
      userId: payload.userId,
      role: payload.role,
      mobile: payload.mobile,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    return sendSuccess(res, {
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
    }, 'Token refreshed successfully');
  } catch (err) {
    return sendError(res, 'Invalid refresh token', 'INVALID_TOKEN', 401);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken: token } = req.body;
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { token, userId: req.user?.id },
      data: { revokedAt: new Date() },
    });
  }
  return sendSuccess(res, null, 'Logged out successfully');
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    include: { employee: true, wallet: true, gamingWallet: true },
  });

  if (!user) {
    return sendError(res, 'User not found', 'NOT_FOUND', 404);
  }

  return sendSuccess(res, {
    id: user.id,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    employee: user.employee ? {
      id: user.employee.id,
      employeeCode: user.employee.employeeCode,
      firstName: user.employee.firstName,
      lastName: user.employee.lastName,
      monthlySalary: Number(user.employee.monthlySalary),
      department: user.employee.department,
      designation: user.employee.designation,
      profileImage: user.employee.profileImage,
    } : null,
    wallet: user.wallet ? {
      currency: user.wallet.currency,
      availableBalance: Number(user.wallet.availableBalance),
      totalEarned: Number(user.wallet.totalEarned),
      totalAdvance: Number(user.wallet.totalAdvance),
      totalWithdrawn: Number(user.wallet.totalWithdrawn),
    } : null,
    gamingWallet: user.gamingWallet ? {
      currency: user.gamingWallet.currency,
      balance: Number(user.gamingWallet.balance),
    } : null,
  });
};
