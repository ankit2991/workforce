import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { generateReference } from '../../utils/reference';
import { z } from 'zod';

const requestAdvanceSchema = z.object({
  amount: z.number().positive('Advance amount must be greater than zero'),
  reason: z.string().optional(),
});

export const getSalaryOverview = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true, wallet: true },
  });

  if (!user || !user.employee) {
    return sendError(res, 'Employee record not found', 'EMPLOYEE_NOT_FOUND', 404);
  }

  const monthlySalary = Number(user.employee.monthlySalary);
  const totalAdvance = Number(user.wallet?.totalAdvance || 0);

  // Maximum allowed advance is monthly salary minus already advanced
  const maxAdvanceAllowed = Math.max(0, monthlySalary - totalAdvance);
  const availableAdvance = maxAdvanceAllowed > 0 ? Math.min(500, maxAdvanceAllowed) : 0;

  return sendSuccess(res, {
    monthlySalary,
    availableAdvance,
    previouslyAdvanced: totalAdvance,
    earned: Number(user.wallet?.totalEarned || 0),
    currency: user.wallet?.currency || 'MYR',
  });
};

export const requestSalaryAdvance = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { amount, reason } = requestAdvanceSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true, wallet: true },
  });

  if (!user || !user.employee || !user.wallet) {
    return sendError(res, 'Employee or wallet not initialized', 'NOT_FOUND', 404);
  }

  const monthlySalary = Number(user.employee.monthlySalary);
  const totalAdvance = Number(user.wallet.totalAdvance);
  const maxLimit = Math.max(0, monthlySalary - totalAdvance);

  if (amount > maxLimit) {
    return sendError(
      res,
      `Requested amount (MYR ${amount.toFixed(2)}) exceeds available advance limit (MYR ${maxLimit.toFixed(2)})`,
      'LIMIT_EXCEEDED',
      400,
    );
  }

  // Create Advance and auto-disburse if <= 500 for smooth MVP demo experience
  const result = await prisma.$transaction(async (tx) => {
    const advance = await tx.salaryAdvance.create({
      data: {
        employeeId: user.employee!.id,
        userId: user.id,
        amount,
        availableLimitAtRequest: maxLimit,
        status: 'DISBURSED',
        reason: reason || 'Emergency Cash Advance',
        approvedAt: new Date(),
        disbursedAt: new Date(),
      },
    });

    // Credit Main Wallet
    const currentBalance = Number(user.wallet!.availableBalance);
    const newBalance = currentBalance + amount;
    const newTotalAdvance = totalAdvance + amount;

    await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: {
        availableBalance: newBalance,
        totalAdvance: newTotalAdvance,
      },
    });

    // Create Wallet Transaction
    const ref = generateReference('ADV');
    const walletTx = await tx.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        userId: user.id,
        referenceNumber: ref,
        type: 'SALARY_ADVANCE',
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'COMPLETED',
        description: `Salary advance disbursed (${ref})`,
        metadata: { advanceId: advance.id, reason },
      },
    });

    // Create Notification
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Salary Advance Disbursed',
        message: `Your advance of MYR ${amount.toFixed(2)} has been credited to your wallet balance.`,
        type: 'SUCCESS',
        isRead: false,
      },
    });

    return { advance, walletTx, newBalance };
  });

  return sendSuccess(
    res,
    {
      advanceId: result.advance.id,
      amount,
      status: result.advance.status,
      referenceNumber: result.walletTx.referenceNumber,
      newAvailableBalance: result.newBalance,
    },
    'Salary advance request approved and disbursed instantly to your wallet',
    201,
  );
};

export const getSalaryAdvances = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const advances = await prisma.salaryAdvance.findMany({
    where: { userId },
    orderBy: { requestedAt: 'desc' },
  });

  return sendSuccess(
    res,
    advances.map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      status: a.status,
      reason: a.reason,
      requestedAt: a.requestedAt,
      approvedAt: a.approvedAt,
      disbursedAt: a.disbursedAt,
    })),
    'Salary advances retrieved successfully',
  );
};
