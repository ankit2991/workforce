import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendPaginated, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { generateReference } from '../../utils/reference';
import { z } from 'zod';

const topUpSchema = z.object({
  amount: z.number().positive('Top up amount must be positive'),
  source: z.string().default('main_wallet'),
});

const cashOutSchema = z.object({
  amount: z.number().positive('Cash out amount must be positive'),
  destination: z.string().default('main_wallet'),
});

export const getGamingWallet = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  let wallet = await prisma.gamingWallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.gamingWallet.create({
      data: {
        userId: userId!,
        currency: 'MYR',
        balance: 0.0,
      },
    });
  }

  return sendSuccess(res, {
    id: wallet.id,
    currency: wallet.currency,
    balance: Number(wallet.balance),
  });
};

export const topUpGamingWallet = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { amount } = topUpSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true, gamingWallet: true },
  });

  if (!user || !user.wallet || !user.gamingWallet) {
    return sendError(res, 'User or wallets not found', 'NOT_FOUND', 404);
  }

  const mainBalance = Number(user.wallet.availableBalance);
  if (amount > mainBalance) {
    return sendError(
      res,
      `Insufficient main wallet balance (Available: MYR ${mainBalance.toFixed(2)})`,
      'INSUFFICIENT_BALANCE',
      400,
    );
  }

  const ref = generateReference('GAM');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Debit Main Wallet
    const newMainBalance = mainBalance - amount;
    await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: { availableBalance: newMainBalance },
    });

    // 2. Create Main Wallet Transaction
    await tx.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        userId: user.id,
        referenceNumber: ref,
        type: 'GAMING_TOPUP',
        amount,
        balanceBefore: mainBalance,
        balanceAfter: newMainBalance,
        status: 'COMPLETED',
        description: `Gaming Wallet Top Up (${ref})`,
      },
    });

    // 3. Credit Gaming Wallet
    const gamingBalance = Number(user.gamingWallet!.balance);
    const newGamingBalance = gamingBalance + amount;
    await tx.gamingWallet.update({
      where: { id: user.gamingWallet!.id },
      data: { balance: newGamingBalance },
    });

    // 4. Create Gaming Transaction
    const gamingTx = await tx.gamingTransaction.create({
      data: {
        gamingWalletId: user.gamingWallet!.id,
        userId: user.id,
        referenceNumber: ref,
        type: 'TOP_UP',
        amount,
        balanceBefore: gamingBalance,
        balanceAfter: newGamingBalance,
        status: 'COMPLETED',
        description: `Top up from Main Wallet`,
      },
    });

    // 5. Notification
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Gaming Wallet Top Up Successful',
        message: `MYR ${amount.toFixed(2)} transferred from Main Wallet to Gaming Wallet.`,
        type: 'SUCCESS',
        isRead: false,
      },
    });

    return { newMainBalance, newGamingBalance, gamingTx };
  });

  return sendSuccess(
    res,
    {
      referenceNumber: ref,
      amount,
      mainWalletBalance: result.newMainBalance,
      gamingWalletBalance: result.newGamingBalance,
    },
    'Gaming wallet topped up successfully',
    201,
  );
};

export const cashOutGamingWallet = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { amount } = cashOutSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true, gamingWallet: true },
  });

  if (!user || !user.wallet || !user.gamingWallet) {
    return sendError(res, 'User or wallets not found', 'NOT_FOUND', 404);
  }

  const gamingBalance = Number(user.gamingWallet.balance);
  if (amount > gamingBalance) {
    return sendError(
      res,
      `Insufficient gaming wallet balance (Available: MYR ${gamingBalance.toFixed(2)})`,
      'INSUFFICIENT_GAMING_BALANCE',
      400,
    );
  }

  const ref = generateReference('GAM');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Debit Gaming Wallet
    const newGamingBalance = gamingBalance - amount;
    await tx.gamingWallet.update({
      where: { id: user.gamingWallet!.id },
      data: { balance: newGamingBalance },
    });

    // 2. Create Gaming Transaction
    const gamingTx = await tx.gamingTransaction.create({
      data: {
        gamingWalletId: user.gamingWallet!.id,
        userId: user.id,
        referenceNumber: ref,
        type: 'CASH_OUT',
        amount,
        balanceBefore: gamingBalance,
        balanceAfter: newGamingBalance,
        status: 'COMPLETED',
        description: `Cash out to Main Wallet`,
      },
    });

    // 3. Credit Main Wallet
    const mainBalance = Number(user.wallet!.availableBalance);
    const newMainBalance = mainBalance + amount;
    await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: { availableBalance: newMainBalance },
    });

    // 4. Create Main Wallet Transaction
    await tx.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        userId: user.id,
        referenceNumber: ref,
        type: 'GAMING_CASHOUT',
        amount,
        balanceBefore: mainBalance,
        balanceAfter: newMainBalance,
        status: 'COMPLETED',
        description: `Gaming Cash Out (${ref})`,
      },
    });

    // 5. Notification
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Gaming Cash Out Complete',
        message: `MYR ${amount.toFixed(2)} winnings cashed out to Main Wallet.`,
        type: 'SUCCESS',
        isRead: false,
      },
    });

    return { newMainBalance, newGamingBalance, gamingTx };
  });

  return sendSuccess(
    res,
    {
      referenceNumber: ref,
      amount,
      mainWalletBalance: result.newMainBalance,
      gamingWalletBalance: result.newGamingBalance,
    },
    'Gaming winnings cashed out to main wallet successfully',
    200,
  );
};

export const getGamingTransactions = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const type = req.query.type as string;

  const skip = (page - 1) * limit;

  const whereClause: any = { userId };
  if (type && type !== 'all') {
    whereClause.type = type.toUpperCase();
  }

  const [total, transactions] = await Promise.all([
    prisma.gamingTransaction.count({ where: whereClause }),
    prisma.gamingTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  const formatted = transactions.map((t) => ({
    id: t.id,
    referenceNumber: t.referenceNumber,
    type: t.type,
    amount: Number(t.amount),
    balanceBefore: Number(t.balanceBefore),
    balanceAfter: Number(t.balanceAfter),
    status: t.status,
    description: t.description,
    createdAt: t.createdAt,
  }));

  return sendPaginated(
    res,
    formatted,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    'Gaming transactions retrieved successfully',
  );
};
