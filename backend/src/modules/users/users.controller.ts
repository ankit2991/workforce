import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
});

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: { include: { company: true } },
      wallet: true,
      gamingWallet: true,
    },
  });

  if (!user) {
    return sendError(res, 'User not found', 'NOT_FOUND', 404);
  }

  return sendSuccess(res, {
    id: user.id,
    mobile: user.mobile,
    email: user.email,
    role: user.role,
    status: user.status,
    employee: user.employee ? {
      id: user.employee.id,
      employeeCode: user.employee.employeeCode,
      firstName: user.employee.firstName,
      lastName: user.employee.lastName,
      name: `${user.employee.firstName} ${user.employee.lastName}`,
      department: user.employee.department,
      designation: user.employee.designation,
      monthlySalary: Number(user.employee.monthlySalary),
      joiningDate: user.employee.joiningDate,
      companyName: user.employee.company.name,
      profileImage: user.employee.profileImage,
    } : null,
    wallet: user.wallet ? {
      availableBalance: Number(user.wallet.availableBalance),
      totalEarned: Number(user.wallet.totalEarned),
      totalAdvance: Number(user.wallet.totalAdvance),
      totalWithdrawn: Number(user.wallet.totalWithdrawn),
      currency: user.wallet.currency,
    } : null,
  });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const data = updateProfileSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: true },
  });

  if (!user) {
    return sendError(res, 'User not found', 'NOT_FOUND', 404);
  }

  await prisma.$transaction(async (tx) => {
    if (data.email) {
      await tx.user.update({
        where: { id: userId },
        data: { email: data.email },
      });
    }

    if (user.employee && (data.firstName || data.lastName || data.department)) {
      await tx.employee.update({
        where: { id: user.employee.id },
        data: {
          ...(data.firstName ? { firstName: data.firstName } : {}),
          ...(data.lastName ? { lastName: data.lastName } : {}),
          ...(data.department ? { department: data.department } : {}),
        },
      });
    }
  });

  return sendSuccess(res, null, 'Profile updated successfully');
};
