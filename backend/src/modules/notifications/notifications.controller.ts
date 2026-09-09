import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const filter = req.query.filter as string; // 'all' | 'unread'

  const whereClause: any = { userId };
  if (filter === 'unread') {
    whereClause.isRead = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return sendSuccess(res, {
    unreadCount,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      link: n.link,
      createdAt: n.createdAt,
    })),
  }, 'Notifications retrieved successfully');
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id;

  const notif = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notif) {
    return sendError(res, 'Notification not found', 'NOT_FOUND', 404);
  }

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return sendSuccess(res, { id, isRead: true }, 'Notification marked as read');
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return sendSuccess(res, null, 'All notifications marked as read');
};
