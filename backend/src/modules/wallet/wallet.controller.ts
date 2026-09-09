import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendPaginated, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getWallet = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return sendError(res, 'Wallet not found', 'WALLET_NOT_FOUND', 404);
  }

  return sendSuccess(res, {
    id: wallet.id,
    currency: wallet.currency,
    availableBalance: Number(wallet.availableBalance),
    totalEarned: Number(wallet.totalEarned),
    totalAdvance: Number(wallet.totalAdvance),
    totalWithdrawn: Number(wallet.totalWithdrawn),
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  });
};

export const getTransactions = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const type = req.query.type as string;

  const skip = (page - 1) * limit;

  const whereClause: any = { userId };
  if (type) {
    whereClause.type = type;
  }

  const [total, transactions] = await Promise.all([
    prisma.walletTransaction.count({ where: whereClause }),
    prisma.walletTransaction.findMany({
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
    metadata: t.metadata,
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
    'Transactions retrieved successfully',
  );
};

export const getTransactionById = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id;

  const transaction = await prisma.walletTransaction.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!transaction) {
    return sendError(res, 'Transaction not found', 'NOT_FOUND', 404);
  }

  return sendSuccess(res, {
    id: transaction.id,
    referenceNumber: transaction.referenceNumber,
    type: transaction.type,
    amount: Number(transaction.amount),
    balanceBefore: Number(transaction.balanceBefore),
    balanceAfter: Number(transaction.balanceAfter),
    status: transaction.status,
    description: transaction.description,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
  });
};
