import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { generateReference } from '../../utils/reference';
import { z } from 'zod';

const withdrawalSchema = z.object({
  amount: z.number().positive('Withdrawal amount must be greater than zero'),
  bankName: z.string().min(2, 'Bank name is required'),
  accountHolder: z.string().min(2, 'Account holder name is required'),
  accountNumber: z.string().min(4, 'Valid account number is required'),
});

export const requestWithdrawal = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { amount, bankName, accountHolder, accountNumber } = withdrawalSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true, wallet: true },
  });

  if (!user || !user.employee || !user.wallet) {
    return sendError(res, 'User wallet not found', 'NOT_FOUND', 404);
  }

  const currentBalance = Number(user.wallet.availableBalance);
  if (amount > currentBalance) {
    return sendError(
      res,
      `Insufficient wallet balance. Available: MYR ${currentBalance.toFixed(2)}`,
      'INSUFFICIENT_BALANCE',
      400,
    );
  }

  const ref = generateReference('WDR');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create withdrawal request
    const withdrawal = await tx.withdrawalRequest.create({
      data: {
        employeeId: user.employee!.id,
        userId: user.id,
        amount,
        bankName,
        accountHolder,
        accountNumber,
        referenceNumber: ref,
        status: 'COMPLETED', // Auto-process in demo/MVP
        processedAt: new Date(),
      },
    });

    // 2. Debit wallet
    const newBalance = currentBalance - amount;
    const newWithdrawn = Number(user.wallet!.totalWithdrawn) + amount;

    await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: {
        availableBalance: newBalance,
        totalWithdrawn: newWithdrawn,
      },
    });

    // 3. Create wallet transaction
    const walletTx = await tx.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        userId: user.id,
        referenceNumber: ref,
        type: 'WITHDRAWAL',
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'COMPLETED',
        description: `Bank withdrawal to ${bankName} (*${accountNumber.slice(-4)})`,
        metadata: { bankName, accountNumber: accountNumber.slice(-4), withdrawalId: withdrawal.id },
      },
    });

    // 4. Create notification
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Withdrawal Processed',
        message: `MYR ${amount.toFixed(2)} withdrawal has been processed successfully to ${bankName}.`,
        type: 'SUCCESS',
        isRead: false,
      },
    });

    return { withdrawal, walletTx, newBalance };
  });

  return sendSuccess(
    res,
    {
      referenceNumber: ref,
      amount,
      bankName,
      status: result.withdrawal.status,
      newAvailableBalance: result.newBalance,
    },
    'Withdrawal request processed successfully',
    201,
  );
};

export const getWithdrawals = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: 'desc' },
  });

  return sendSuccess(
    res,
    withdrawals.map((w) => ({
      id: w.id,
      referenceNumber: w.referenceNumber,
      amount: Number(w.amount),
      bankName: w.bankName,
      accountHolder: w.accountHolder,
      accountNumberMasked: `*${w.accountNumber.slice(-4)}`,
      status: w.status,
      requestedAt: w.requestedAt,
      processedAt: w.processedAt,
    })),
    'Withdrawals retrieved successfully',
  );
};
