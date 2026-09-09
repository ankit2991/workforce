import { Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { generateReference } from '../../utils/reference';
import { z } from 'zod';

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID required'),
      quantity: z.number().int().positive('Quantity must be at least 1'),
    }),
  ).min(1, 'At least one product required'),
  paymentMethod: z.string().default('wallet'),
  shippingAddress: z.any().optional(),
});

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { items, paymentMethod, shippingAddress } = createOrderSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true, employee: true },
  });

  if (!user || !user.wallet) {
    return sendError(res, 'User wallet not found', 'NOT_FOUND', 404);
  }

  // 1. Fetch products and calculate server-side prices
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });

  if (products.length !== productIds.length) {
    return sendError(res, 'One or more selected products are invalid or inactive', 'INVALID_PRODUCTS', 400);
  }

  let totalAmount = 0;
  const orderItemData: Array<{ productId: string; quantity: number; price: number; subtotal: number; name: string }> = [];

  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId)!;
    if (prod.stock < item.quantity) {
      return sendError(res, `Insufficient stock for product "${prod.name}" (In stock: ${prod.stock})`, 'OUT_OF_STOCK', 400);
    }
    const unitPrice = Number(prod.price);
    const subtotal = unitPrice * item.quantity;
    totalAmount += subtotal;
    orderItemData.push({
      productId: prod.id,
      quantity: item.quantity,
      price: unitPrice,
      subtotal,
      name: prod.name,
    });
  }

  // 2. Check wallet balance
  const currentBalance = Number(user.wallet.availableBalance);
  if (totalAmount > currentBalance) {
    return sendError(
      res,
      `Insufficient wallet balance. Total: MYR ${totalAmount.toFixed(2)}, Available: MYR ${currentBalance.toFixed(2)}`,
      'INSUFFICIENT_BALANCE',
      400,
    );
  }

  const orderNumber = generateReference('ORD');
  const txRef = generateReference('SHOP');

  // 3. Execute atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Debit wallet
    const newBalance = currentBalance - totalAmount;
    await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: { availableBalance: newBalance },
    });

    // B. Decrement stock
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // C. Create Order & Items
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        employeeId: user.employee?.id,
        totalAmount,
        paymentMethod: paymentMethod.toUpperCase(),
        status: 'PROCESSING',
        shippingAddress: shippingAddress || { type: 'DIGITAL_VOUCHER_AUTO_ISSUED' },
        items: {
          create: orderItemData.map((oi) => ({
            productId: oi.productId,
            quantity: oi.quantity,
            price: oi.price,
            subtotal: oi.subtotal,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // D. Create Wallet Transaction
    await tx.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        userId: user.id,
        referenceNumber: txRef,
        type: 'SHOP_PAYMENT',
        amount: totalAmount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        status: 'COMPLETED',
        description: `Shop purchase - Order #${orderNumber}`,
        metadata: { orderId: order.id, orderNumber, itemsCount: items.length },
      },
    });

    // E. Create Notification
    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Order Confirmed',
        message: `Your order #${orderNumber} for MYR ${totalAmount.toFixed(2)} has been placed successfully.`,
        type: 'SUCCESS',
        isRead: false,
      },
    });

    return { order, newBalance };
  });

  return sendSuccess(
    res,
    {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      totalAmount: Number(result.order.totalAmount),
      status: result.order.status,
      remainingWalletBalance: result.newBalance,
      items: result.order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        quantity: i.quantity,
        price: Number(i.price),
        subtotal: Number(i.subtotal),
      })),
      createdAt: result.order.createdAt,
    },
    'Order placed successfully',
    201,
  );
};

export const getOrders = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    totalAmount: Number(o.totalAmount),
    paymentMethod: o.paymentMethod,
    status: o.status,
    itemsCount: o.items.length,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      image: i.product.image,
      quantity: i.quantity,
      price: Number(i.price),
      subtotal: Number(i.subtotal),
    })),
    createdAt: o.createdAt,
  }));

  return sendSuccess(res, formatted, 'Orders retrieved successfully');
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id;

  const order = await prisma.order.findFirst({
    where: { id, userId },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!order) {
    return sendError(res, 'Order not found', 'NOT_FOUND', 404);
  }

  return sendSuccess(res, {
    id: order.id,
    orderNumber: order.orderNumber,
    totalAmount: Number(order.totalAmount),
    paymentMethod: order.paymentMethod,
    status: order.status,
    shippingAddress: order.shippingAddress,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.product.name,
      image: i.product.image,
      quantity: i.quantity,
      price: Number(i.price),
      subtotal: Number(i.subtotal),
    })),
    createdAt: order.createdAt,
  });
};
