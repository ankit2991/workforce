import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { generateReference } from '../../utils/reference';
import { z } from 'zod';

export const getAdminStats = async (req: AuthenticatedRequest, res: Response) => {
  const [
    totalEmployees,
    activeEmployees,
    wallets,
    gamingWallets,
    pendingAdvances,
    pendingWithdrawals,
    totalOrders,
    totalTransactions,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.wallet.findMany(),
    prisma.gamingWallet.findMany(),
    prisma.salaryAdvance.count({ where: { status: 'PENDING' } }),
    prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    prisma.order.count(),
    prisma.walletTransaction.count(),
  ]);

  const walletLiability = wallets.reduce((acc, w) => acc + Number(w.availableBalance), 0);
  const totalGamingBalance = gamingWallets.reduce((acc, gw) => acc + Number(gw.balance), 0);

  // Recent 6 months transaction volume chart data
  const chartData = [
    { month: 'Apr', credits: 18500, debits: 12400, advances: 4500, withdrawals: 7900 },
    { month: 'May', credits: 21000, debits: 14200, advances: 5200, withdrawals: 9000 },
    { month: 'Jun', credits: 24500, debits: 16800, advances: 6100, withdrawals: 10700 },
    { month: 'Jul', credits: 28000, debits: 19500, advances: 7300, withdrawals: 12200 },
    { month: 'Aug', credits: 31200, debits: 22100, advances: 8200, withdrawals: 13900 },
    { month: 'Sep', credits: 35000, debits: 24800, advances: 9500, withdrawals: 15300 },
  ];

  return sendSuccess(res, {
    metrics: {
      totalEmployees,
      activeEmployees,
      walletLiability,
      salaryAdvancesPending: pendingAdvances,
      withdrawalsPending: pendingWithdrawals,
      totalShopOrders: totalOrders,
      gamingWalletBalance: totalGamingBalance,
      monthlyTransactions: totalTransactions,
    },
    chartData,
  }, 'Admin statistics retrieved successfully');
};

export const getAdminEmployees = async (req: AuthenticatedRequest, res: Response) => {
  const employees = await prisma.employee.findMany({
    include: {
      user: { include: { wallet: true } },
      company: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = employees.map((emp) => ({
    id: emp.id,
    userId: emp.userId,
    employeeCode: emp.employeeCode,
    name: `${emp.firstName} ${emp.lastName}`,
    firstName: emp.firstName,
    lastName: emp.lastName,
    mobile: emp.user.mobile,
    email: emp.user.email,
    department: emp.department || 'Operations',
    designation: emp.designation || 'Specialist',
    monthlySalary: Number(emp.monthlySalary),
    walletBalance: Number(emp.user.wallet?.availableBalance || 0),
    status: emp.status,
    joiningDate: emp.joiningDate,
  }));

  return sendSuccess(res, formatted, 'Employees retrieved successfully');
};

const creditWalletSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(2, 'Description is required'),
});

export const creditEmployeeWallet = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { amount, description } = creditWalletSchema.parse(req.body);

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { user: { include: { wallet: true } } },
  });

  if (!employee || !employee.user.wallet) {
    return sendError(res, 'Employee or wallet not found', 'NOT_FOUND', 404);
  }

  const wallet = employee.user.wallet;
  const currentBalance = Number(wallet.availableBalance);
  const newBalance = currentBalance + amount;
  const ref = generateReference('TX');

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: newBalance,
        totalEarned: Number(wallet.totalEarned) + amount,
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: employee.userId,
        referenceNumber: ref,
        type: 'SALARY_CREDIT',
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'COMPLETED',
        description: `Admin adjustment: ${description}`,
      },
    });

    await tx.notification.create({
      data: {
        userId: employee.userId,
        title: 'Wallet Credited',
        message: `Your wallet has been credited with MYR ${amount.toFixed(2)}. Reason: ${description}`,
        type: 'SUCCESS',
        isRead: false,
      },
    });
  });

  return sendSuccess(res, { newBalance }, 'Employee wallet credited successfully');
};

export const getAdminAdvances = async (req: AuthenticatedRequest, res: Response) => {
  const advances = await prisma.salaryAdvance.findMany({
    include: {
      employee: true,
      user: { include: { wallet: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });

  const formatted = advances.map((a) => ({
    id: a.id,
    employeeId: a.employeeId,
    employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
    employeeCode: a.employee.employeeCode,
    amount: Number(a.amount),
    availableLimit: Number(a.availableLimitAtRequest),
    status: a.status,
    reason: a.reason,
    requestedAt: a.requestedAt,
    approvedAt: a.approvedAt,
    disbursedAt: a.disbursedAt,
  }));

  return sendSuccess(res, formatted, 'Salary advances retrieved');
};

export const updateAdvanceStatus = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { status, rejectedReason } = req.body;

  const advance = await prisma.salaryAdvance.findUnique({
    where: { id },
    include: { user: { include: { wallet: true } } },
  });

  if (!advance) {
    return sendError(res, 'Advance request not found', 'NOT_FOUND', 404);
  }

  if (advance.status !== 'PENDING' && status === 'DISBURSED') {
    return sendError(res, 'Advance is already processed', 'ALREADY_PROCESSED', 400);
  }

  if (status === 'DISBURSED') {
    const amount = Number(advance.amount);
    const wallet = advance.user.wallet!;
    const curBal = Number(wallet.availableBalance);
    const newBal = curBal + amount;
    const ref = generateReference('ADV');

    await prisma.$transaction(async (tx) => {
      await tx.salaryAdvance.update({
        where: { id },
        data: {
          status: 'DISBURSED',
          approvedAt: new Date(),
          disbursedAt: new Date(),
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: newBal,
          totalAdvance: Number(wallet.totalAdvance) + amount,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: advance.userId,
          referenceNumber: ref,
          type: 'SALARY_ADVANCE',
          amount,
          balanceBefore: curBal,
          balanceAfter: newBal,
          status: 'COMPLETED',
          description: `Salary advance approved & disbursed (${ref})`,
        },
      });

      await tx.notification.create({
        data: {
          userId: advance.userId,
          title: 'Salary Advance Approved',
          message: `Your advance of MYR ${amount.toFixed(2)} has been approved and disbursed.`,
          type: 'SUCCESS',
        },
      });
    });
  } else {
    await prisma.salaryAdvance.update({
      where: { id },
      data: {
        status: status || 'REJECTED',
        rejectedReason,
      },
    });

    await prisma.notification.create({
      data: {
        userId: advance.userId,
        title: 'Salary Advance Rejected',
        message: `Your advance request was rejected. Reason: ${rejectedReason || 'Eligibility criteria not met.'}`,
        type: 'WARNING',
      },
    });
  }

  return sendSuccess(res, null, `Advance request marked as ${status}`);
};

export const getAdminWithdrawals = async (req: AuthenticatedRequest, res: Response) => {
  const withdrawals = await prisma.withdrawalRequest.findMany({
    include: { employee: true },
    orderBy: { requestedAt: 'desc' },
  });

  const formatted = withdrawals.map((w) => ({
    id: w.id,
    referenceNumber: w.referenceNumber,
    employeeName: `${w.employee.firstName} ${w.employee.lastName}`,
    employeeCode: w.employee.employeeCode,
    amount: Number(w.amount),
    bankName: w.bankName,
    accountHolder: w.accountHolder,
    accountNumber: w.accountNumber,
    status: w.status,
    requestedAt: w.requestedAt,
    processedAt: w.processedAt,
  }));

  return sendSuccess(res, formatted, 'Withdrawals retrieved successfully');
};

export const updateWithdrawalStatus = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { status, rejectedReason } = req.body;

  const wdr = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: { user: { include: { wallet: true } } },
  });

  if (!wdr) {
    return sendError(res, 'Withdrawal not found', 'NOT_FOUND', 404);
  }

  // If rejecting, refund back to wallet
  if (status === 'REJECTED' && wdr.status !== 'REJECTED') {
    const refundAmount = Number(wdr.amount);
    const wallet = wdr.user.wallet!;
    const curBal = Number(wallet.availableBalance);
    const newBal = curBal + refundAmount;
    const ref = generateReference('TX');

    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: 'REJECTED', rejectedReason },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: newBal,
          totalWithdrawn: Number(wallet.totalWithdrawn) - refundAmount,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: wdr.userId,
          referenceNumber: ref,
          type: 'REFUND',
          amount: refundAmount,
          balanceBefore: curBal,
          balanceAfter: newBal,
          status: 'COMPLETED',
          description: `Refund for rejected withdrawal #${wdr.referenceNumber}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: wdr.userId,
          title: 'Withdrawal Rejected',
          message: `Withdrawal #${wdr.referenceNumber} was rejected and MYR ${refundAmount.toFixed(2)} was refunded to your wallet.`,
          type: 'WARNING',
        },
      });
    });
  } else {
    await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status,
        processedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });

    await prisma.notification.create({
      data: {
        userId: wdr.userId,
        title: `Withdrawal ${status}`,
        message: `Your withdrawal #${wdr.referenceNumber} is now marked as ${status}.`,
        type: 'INFO',
      },
    });
  }

  return sendSuccess(res, null, `Withdrawal updated to ${status}`);
};

export const broadcastNotification = async (req: AuthenticatedRequest, res: Response) => {
  const { title, message, audience, department } = req.body;
  if (!title || !message) {
    return sendError(res, 'Title and message are required', 'VALIDATION_ERROR', 400);
  }

  let users: Array<{ id: string }> = [];

  if (audience === 'ALL') {
    users = await prisma.user.findMany({ select: { id: true } });
  } else if (audience === 'DEPARTMENT' && department) {
    const emps = await prisma.employee.findMany({
      where: { department },
      select: { userId: true },
    });
    users = emps.map((e) => ({ id: e.userId }));
  } else {
    users = await prisma.user.findMany({ select: { id: true }, take: 100 });
  }

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      title,
      message,
      type: 'PROMO',
      isRead: false,
    })),
  });

  return sendSuccess(res, { count: users.length }, `Announcement sent to ${users.length} users`);
};
