import { PrismaClient, Role, UserStatus, EmployeeStatus, TransactionType, TransactionStatus, AdvanceStatus, WithdrawalStatus, GamingTxType, GameBadge, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Company
  const company = await prisma.company.upsert({
    where: { code: 'CMP-001' },
    update: {},
    create: {
      name: 'Apex Workforce Global',
      code: 'CMP-001',
      status: 'ACTIVE',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Create Demo Employee User (John Doe - EMP001)
  const employeeUser = await prisma.user.upsert({
    where: { mobile: '+60123456789' },
    update: {},
    create: {
      mobile: '+60123456789',
      email: 'john.doe@workforce.com',
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
    },
  });

  // 3. Create Demo Admin User
  const adminUser = await prisma.user.upsert({
    where: { mobile: '+60199999999' },
    update: {},
    create: {
      mobile: '+60199999999',
      email: 'admin@workforce.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // 4. Create Employee Record
  const employee = await prisma.employee.upsert({
    where: { employeeCode: 'EMP001' },
    update: {},
    create: {
      userId: employeeUser.id,
      companyId: company.id,
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      monthlySalary: 1500.0,
      department: 'Logistics & Operations',
      designation: 'Senior Warehouse Specialist',
      status: EmployeeStatus.ACTIVE,
      joiningDate: new Date('2024-01-15'),
      profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
  });

  // 5. Create Main Wallet
  const wallet = await prisma.wallet.upsert({
    where: { userId: employeeUser.id },
    update: {
      availableBalance: 1200.0,
      totalEarned: 0.0,
      totalAdvance: 1500.0,
      totalWithdrawn: 300.0,
    },
    create: {
      userId: employeeUser.id,
      employeeId: employee.id,
      currency: 'MYR',
      availableBalance: 1200.0,
      totalEarned: 0.0,
      totalAdvance: 1500.0,
      totalWithdrawn: 300.0,
    },
  });

  // 6. Create Gaming Wallet
  const gamingWallet = await prisma.gamingWallet.upsert({
    where: { userId: employeeUser.id },
    update: {
      balance: 0.0,
    },
    create: {
      userId: employeeUser.id,
      employeeId: employee.id,
      currency: 'MYR',
      balance: 0.0,
    },
  });

  // 7. Seed Wallet Transactions
  const walletTxs = [
    {
      referenceNumber: 'ADV-20260903-QP92',
      type: TransactionType.SALARY_ADVANCE,
      amount: 500.0,
      balanceBefore: 1000.0,
      balanceAfter: 1500.0,
      status: TransactionStatus.COMPLETED,
      description: 'Salary advance disbursed',
      createdAt: new Date('2026-09-03T10:15:00Z'),
    },
    {
      referenceNumber: 'WDR-20260903-8K3D2',
      type: TransactionType.WITHDRAWAL,
      amount: 300.0,
      balanceBefore: 1500.0,
      balanceAfter: 1200.0,
      status: TransactionStatus.COMPLETED,
      description: 'Bank withdrawal to Maybank (*4821)',
      createdAt: new Date('2026-09-03T14:30:00Z'),
    },
    {
      referenceNumber: 'GAM-20260902-LK20',
      type: TransactionType.GAMING_TOPUP,
      amount: 50.0,
      balanceBefore: 1050.0,
      balanceAfter: 1000.0,
      status: TransactionStatus.COMPLETED,
      description: 'Gaming Wallet Top Up',
      createdAt: new Date('2026-09-02T19:45:00Z'),
    },
    {
      referenceNumber: 'GAM-20260902-CW91',
      type: TransactionType.GAMING_CASHOUT,
      amount: 75.0,
      balanceBefore: 975.0,
      balanceAfter: 1050.0,
      status: TransactionStatus.COMPLETED,
      description: 'Gaming Cash Out (Winnings)',
      createdAt: new Date('2026-09-02T20:50:00Z'),
    },
    {
      referenceNumber: 'ADV-20260828-TR11',
      type: TransactionType.SALARY_ADVANCE,
      amount: 500.0,
      balanceBefore: 475.0,
      balanceAfter: 975.0,
      status: TransactionStatus.COMPLETED,
      description: 'Salary advance disbursed',
      createdAt: new Date('2026-08-28T09:00:00Z'),
    },
    {
      referenceNumber: 'SHOP-20260825-MB88',
      type: TransactionType.SHOP_PAYMENT,
      amount: 45.0,
      balanceBefore: 520.0,
      balanceAfter: 475.0,
      status: TransactionStatus.COMPLETED,
      description: 'Shop purchase - Grocery Voucher',
      createdAt: new Date('2026-08-25T16:20:00Z'),
    },
    {
      referenceNumber: 'ADV-20260815-QP01',
      type: TransactionType.SALARY_ADVANCE,
      amount: 500.0,
      balanceBefore: 20.0,
      balanceAfter: 520.0,
      status: TransactionStatus.COMPLETED,
      description: 'Salary advance disbursed',
      createdAt: new Date('2026-08-15T11:00:00Z'),
    },
  ];

  for (const tx of walletTxs) {
    await prisma.walletTransaction.upsert({
      where: { referenceNumber: tx.referenceNumber },
      update: {},
      create: {
        walletId: wallet.id,
        userId: employeeUser.id,
        ...tx,
      },
    });
  }

  // 8. Seed Game Categories
  const categories = [
    { name: 'All Games', slug: 'all', icon: 'Sparkles', sortOrder: 0 },
    { name: 'Slots', slug: 'slots', icon: 'Flame', sortOrder: 1 },
    { name: 'Crash', slug: 'crash', icon: 'Rocket', sortOrder: 2 },
    { name: 'Live Casino', slug: 'live-casino', icon: 'Tv', sortOrder: 3 },
    { name: 'Arcade', slug: 'arcade', icon: 'Gamepad2', sortOrder: 4 },
    { name: 'Other', slug: 'other', icon: 'Dice5', sortOrder: 5 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const record = await prisma.gameCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
  }

  // 9. Seed 12 Original Games
  const games = [
    {
      name: 'Candy Fortune',
      slug: 'candy-fortune',
      categoryId: categoryMap.get('slots')!,
      provider: 'SweetWorks Games',
      thumbnail: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=400',
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 500.0,
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: 'Olympus Quest',
      slug: 'olympus-quest',
      categoryId: categoryMap.get('slots')!,
      provider: 'Mythic Play',
      thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
      status: GameBadge.POPULAR,
      minBet: 2.0,
      maxBet: 800.0,
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Sky Aviator',
      slug: 'sky-aviator',
      categoryId: categoryMap.get('crash')!,
      provider: 'Velocity Tech',
      thumbnail: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400',
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 1000.0,
      isFeatured: true,
      sortOrder: 3,
    },
    {
      name: 'Royal Baccarat',
      slug: 'royal-baccarat',
      categoryId: categoryMap.get('live-casino')!,
      provider: 'Grand Studios',
      thumbnail: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=400',
      status: GameBadge.DEFAULT,
      minBet: 5.0,
      maxBet: 2000.0,
      isFeatured: false,
      sortOrder: 4,
    },
    {
      name: 'Lucky Roulette',
      slug: 'lucky-roulette',
      categoryId: categoryMap.get('live-casino')!,
      provider: 'Spin Palace Live',
      thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400',
      status: GameBadge.POPULAR,
      minBet: 2.0,
      maxBet: 1500.0,
      isFeatured: true,
      sortOrder: 5,
    },
    {
      name: 'Night Blackjack',
      slug: 'night-blackjack',
      categoryId: categoryMap.get('live-casino')!,
      provider: 'Club Noir',
      thumbnail: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=400',
      status: GameBadge.NEW,
      minBet: 10.0,
      maxBet: 3000.0,
      isFeatured: false,
      sortOrder: 6,
    },
    {
      name: 'Dragon Fortune',
      slug: 'dragon-fortune',
      categoryId: categoryMap.get('slots')!,
      provider: 'Eastern Fortune',
      thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400',
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 600.0,
      isFeatured: true,
      sortOrder: 7,
    },
    {
      name: 'Book of Gold',
      slug: 'book-of-gold',
      categoryId: categoryMap.get('slots')!,
      provider: 'Pharaoh Gaming',
      thumbnail: 'https://images.unsplash.com/photo-1533158307587-828f0a76ef96?w=400',
      status: GameBadge.POPULAR,
      minBet: 1.0,
      maxBet: 500.0,
      isFeatured: false,
      sortOrder: 8,
    },
    {
      name: 'Big Bass Adventure',
      slug: 'big-bass-adventure',
      categoryId: categoryMap.get('slots')!,
      provider: 'Reel Wild',
      thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
      status: GameBadge.DEFAULT,
      minBet: 2.0,
      maxBet: 700.0,
      isFeatured: false,
      sortOrder: 9,
    },
    {
      name: 'Lucky Cat',
      slug: 'lucky-cat',
      categoryId: categoryMap.get('arcade')!,
      provider: 'Neko Arcade',
      thumbnail: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400',
      status: GameBadge.NEW,
      minBet: 0.5,
      maxBet: 200.0,
      isFeatured: false,
      sortOrder: 10,
    },
    {
      name: 'Mines',
      slug: 'mines',
      categoryId: categoryMap.get('arcade')!,
      provider: 'Grid Logic',
      thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
      status: GameBadge.HOT,
      minBet: 1.0,
      maxBet: 1000.0,
      isFeatured: true,
      sortOrder: 11,
    },
    {
      name: 'Plinko',
      slug: 'plinko',
      categoryId: categoryMap.get('arcade')!,
      provider: 'Drop Zone Games',
      thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
      status: GameBadge.POPULAR,
      minBet: 1.0,
      maxBet: 500.0,
      isFeatured: true,
      sortOrder: 12,
    },
  ];

  for (const game of games) {
    await prisma.game.upsert({
      where: { slug: game.slug },
      update: {},
      create: game,
    });
  }

  // 10. Seed Shop Categories
  const shopCategories = [
    { name: 'Vouchers & Gift Cards', slug: 'vouchers', icon: 'Gift' },
    { name: 'Electronics', slug: 'electronics', icon: 'Smartphone' },
    { name: 'Groceries & Essentials', slug: 'essentials', icon: 'ShoppingBasket' },
    { name: 'Lifestyle & Health', slug: 'lifestyle', icon: 'Heart' },
  ];

  const shopCatMap = new Map<string, string>();
  for (const scat of shopCategories) {
    const sc = await prisma.productCategory.upsert({
      where: { slug: scat.slug },
      update: {},
      create: scat,
    });
    shopCatMap.set(scat.slug, sc.id);
  }

  // 11. Seed 8 Products
  const products = [
    {
      name: 'GrabFood RM50 Voucher',
      slug: 'grabfood-rm50',
      categoryId: shopCatMap.get('vouchers')!,
      description: 'E-voucher valid for all GrabFood food and beverage orders across Malaysia.',
      shortDescription: 'RM50 E-Voucher for dining and grocery delivery.',
      image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
      price: 50.0,
      points: 500,
      stock: 120,
      isFeatured: true,
    },
    {
      name: 'Lotus Supermarket RM100 Voucher',
      slug: 'lotus-rm100',
      categoryId: shopCatMap.get('vouchers')!,
      description: 'Digital gift voucher accepted at all Lotus hypermarkets for groceries and household goods.',
      shortDescription: 'RM100 voucher for fresh groceries and items.',
      image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400',
      price: 100.0,
      points: 1000,
      stock: 65,
      isFeatured: true,
    },
    {
      name: 'Wireless Bluetooth Earbuds Pro',
      slug: 'wireless-earbuds-pro',
      categoryId: shopCatMap.get('electronics')!,
      description: 'High-fidelity audio with active noise cancelling, USB-C fast charge, and 24h battery life.',
      shortDescription: 'True wireless earbuds with ANC & long battery.',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
      price: 125.0,
      points: 1250,
      stock: 35,
      isFeatured: true,
    },
    {
      name: '20,000mAh Power Bank Fast Charge',
      slug: 'power-bank-20000mah',
      categoryId: shopCatMap.get('electronics')!,
      description: 'Dual output fast-charging battery pack compatible with iPhone and Android devices.',
      shortDescription: 'High capacity portable charger with dual ports.',
      image: 'https://images.unsplash.com/photo-1609592424361-b4f7ceec7f21?w=400',
      price: 79.0,
      points: 790,
      stock: 45,
      isFeatured: false,
    },
    {
      name: 'Monthly Grocery Essentials Basket',
      slug: 'grocery-essentials-basket',
      categoryId: shopCatMap.get('essentials')!,
      description: 'Assorted daily essentials: 5kg premium rice, cooking oil, canned tuna, oats, and tea.',
      shortDescription: 'Comprehensive household grocery package.',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
      price: 85.0,
      points: 850,
      stock: 80,
      isFeatured: true,
    },
    {
      name: 'Smart Health Fitness Band',
      slug: 'smart-health-band',
      categoryId: shopCatMap.get('lifestyle')!,
      description: 'Step tracker, 24/7 heart rate monitor, sleep analysis, and water resistance.',
      shortDescription: 'Waterproof tracker for steps, sleep & pulse.',
      image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
      price: 99.0,
      points: 990,
      stock: 50,
      isFeatured: false,
    },
    {
      name: 'Thermal Steel Water Bottle 750ml',
      slug: 'thermal-water-bottle-750ml',
      categoryId: shopCatMap.get('lifestyle')!,
      description: 'Double-walled vacuum insulated stainless steel flask. Keeps beverages cold 24h / hot 12h.',
      shortDescription: '750ml double-walled insulated bottle.',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
      price: 38.0,
      points: 380,
      stock: 90,
      isFeatured: false,
    },
    {
      name: 'Touch n Go eWallet RM30 Reload PIN',
      slug: 'tng-rm30-pin',
      categoryId: shopCatMap.get('vouchers')!,
      description: 'Instant reload PIN for your Touch n Go digital wallet for tolls, parking, and street merchants.',
      shortDescription: 'Instant RM30 reload PIN code.',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400',
      price: 30.0,
      points: 300,
      stock: 200,
      isFeatured: true,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: prod,
    });
  }

  // 12. Seed 10 Notifications
  const notifications = [
    {
      userId: employeeUser.id,
      title: 'Withdrawal Processed',
      message: 'MYR 300.00 withdrawal has been processed successfully to Maybank (*4821).',
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date('2026-09-03T14:30:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Salary Advance Disbursed',
      message: 'Your salary advance request of MYR 500.00 has been approved and credited to your wallet.',
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date('2026-09-03T10:15:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Gaming Wallet Top Up Successful',
      message: 'MYR 50.00 transferred from Main Wallet to Gaming Wallet.',
      type: 'INFO',
      isRead: true,
      createdAt: new Date('2026-09-02T19:45:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Gaming Cash Out Complete',
      message: 'MYR 75.00 winnings cashed out to Main Wallet.',
      type: 'SUCCESS',
      isRead: true,
      createdAt: new Date('2026-09-02T20:50:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Salary Advance Approved',
      message: 'Advance request #ADV-20260828-TR11 has been approved by Finance.',
      type: 'INFO',
      isRead: true,
      createdAt: new Date('2026-08-28T09:00:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Order Confirmed',
      message: 'Order #ORD-20260825-MB88 for Lotus Supermarket Voucher has been issued.',
      type: 'SUCCESS',
      isRead: true,
      createdAt: new Date('2026-08-25T16:25:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Monthly Pay Slip Generated',
      message: 'Your August salary statement is now available for review.',
      type: 'INFO',
      isRead: true,
      createdAt: new Date('2026-08-31T18:00:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Security Alert: New Device',
      message: 'Login detected from Mobile App on Android 15 (Kuala Lumpur, MY).',
      type: 'WARNING',
      isRead: true,
      createdAt: new Date('2026-09-01T08:12:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Welcome to WorkPay',
      message: 'Your workforce digital wallet has been activated. Enjoy zero-fee advances and perks.',
      type: 'INFO',
      isRead: true,
      createdAt: new Date('2026-08-01T08:00:00Z'),
    },
    {
      userId: employeeUser.id,
      title: 'Weekend Gaming Tournament',
      message: 'Top the leaderboard in Sky Aviator this weekend and win up to MYR 1,000 in bonuses!',
      type: 'PROMO',
      isRead: false,
      createdAt: new Date('2026-09-03T18:00:00Z'),
    },
  ];

  await prisma.notification.deleteMany({ where: { userId: employeeUser.id } });
  for (const notif of notifications) {
    await prisma.notification.create({
      data: notif,
    });
  }

  // 13. Seed Banners
  const banners = [
    {
      title: 'Play & Win Big',
      subtitle: 'Top up your Gaming Wallet and unlock exciting rewards.',
      tag: 'HOT',
      ctaText: 'Play Now →',
      ctaLink: '/gaming',
      bgGradient: 'from-purple-900/60 via-indigo-950/80 to-slate-950',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
      sortOrder: 1,
    },
    {
      title: 'Zero Fee Instant Advances',
      subtitle: 'Need emergency cash? Request up to MYR 500 instantly.',
      tag: 'FINANCE',
      ctaText: 'Get Advance →',
      ctaLink: '/wallet?action=advance',
      bgGradient: 'from-blue-900/60 via-slate-900 to-slate-950',
      image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600',
      sortOrder: 2,
    },
    {
      title: 'Workforce Deals & Vouchers',
      subtitle: 'Redeem dining, grocery and electronics vouchers with wallet balance.',
      tag: 'SHOP',
      ctaText: 'Browse Shop →',
      ctaLink: '/shop',
      bgGradient: 'from-emerald-950/60 via-slate-900 to-slate-950',
      image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600',
      sortOrder: 3,
    },
  ];

  await prisma.banner.deleteMany({});
  for (const b of banners) {
    await prisma.banner.create({
      data: b,
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log(`👤 Demo Employee: John Doe (EMP001) | Mobile: +60123456789 | OTP: 123456`);
  console.log(`🛡️ Demo Admin: Admin Manager | Mobile: +60199999999 | OTP: 123456`);
  console.log(`💰 Available Balance: MYR 1,200.00 | Salary: MYR 1,500.00`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
