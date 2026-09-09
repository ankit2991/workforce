import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getDashboardData = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, 'User identity missing', 'UNAUTHENTICATED', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: true,
      wallet: true,
      gamingWallet: true,
    },
  });

  if (!user) {
    return sendError(res, 'User record not found', 'NOT_FOUND', 404);
  }

  // Fetch recent 5 transactions
  const recentTransactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Fetch active promotional banners
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    take: 5,
  });

  // Unread notification count
  const unreadNotifications = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return sendSuccess(res, {
    employee: user.employee ? {
      id: user.employee.id,
      employeeCode: user.employee.employeeCode,
      firstName: user.employee.firstName,
      lastName: user.employee.lastName,
      name: `${user.employee.firstName} ${user.employee.lastName}`,
      department: user.employee.department,
      designation: user.employee.designation,
      profileImage: user.employee.profileImage,
    } : {
      employeeCode: 'EMP001',
      name: 'John Doe',
    },
    wallet: user.wallet ? {
      currency: user.wallet.currency,
      availableBalance: Number(user.wallet.availableBalance),
      earned: Number(user.wallet.totalEarned),
      advances: Number(user.wallet.totalAdvance),
      withdrawn: Number(user.wallet.totalWithdrawn),
      expectedMonthlySalary: user.employee ? Number(user.employee.monthlySalary) : 1500.0,
    } : {
      currency: 'MYR',
      availableBalance: 1200.0,
      earned: 0.0,
      advances: 1500.0,
      withdrawn: 300.0,
      expectedMonthlySalary: 1500.0,
    },
    gamingWallet: user.gamingWallet ? {
      currency: user.gamingWallet.currency,
      balance: Number(user.gamingWallet.balance),
    } : {
      currency: 'MYR',
      balance: 0.0,
    },
    recentTransactions: recentTransactions.map((tx) => ({
      id: tx.id,
      referenceNumber: tx.referenceNumber,
      type: tx.type,
      amount: Number(tx.amount),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
    })),
    banners: banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      tag: b.tag,
      ctaText: b.ctaText,
      ctaLink: b.ctaLink,
      bgGradient: b.bgGradient,
      image: b.image,
    })),
    unreadNotifications,
  }, 'Dashboard data loaded successfully');
};
