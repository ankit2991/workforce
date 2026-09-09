import type { User, Wallet, GamingWallet, WalletTransaction, Game, GameCategory, Product, Order, NotificationItem, BannerItem } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Initial Mock / Seed State for robust frontend resilience
const initialEmployee = {
  id: 'emp-001',
  employeeCode: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  name: 'John Doe',
  department: 'Logistics & Operations',
  designation: 'Senior Warehouse Specialist',
  monthlySalary: 1500.0,
  joiningDate: '2024-01-15',
  profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
};

const initialWallet: Wallet = {
  currency: 'MYR',
  availableBalance: 1200.0,
  totalEarned: 0.0,
  totalAdvance: 1500.0,
  totalWithdrawn: 300.0,
  expectedMonthlySalary: 1500.0,
};

const initialGamingWallet: GamingWallet = {
  currency: 'MYR',
  balance: 0.0,
};

const initialBanners: BannerItem[] = [
  {
    id: 'b-1',
    title: 'Play & Win Big',
    subtitle: 'Top up your Gaming Wallet and unlock exciting rewards.',
    tag: 'HOT',
    ctaText: 'Play Now →',
    ctaLink: '/gaming',
    bgGradient: 'from-purple-900/80 via-indigo-950 to-slate-950',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
  },
  {
    id: 'b-2',
    title: 'Zero Fee Instant Advances',
    subtitle: 'Need emergency cash? Request up to MYR 500 instantly.',
    tag: 'FINANCE',
    ctaText: 'Get Advance →',
    ctaLink: '/wallet?action=advance',
    bgGradient: 'from-blue-900/80 via-slate-900 to-slate-950',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600',
  },
  {
    id: 'b-3',
    title: 'Workforce Deals & Vouchers',
    subtitle: 'Redeem groceries, gadgets and vouchers with wallet balance.',
    tag: 'SHOP',
    ctaText: 'Browse Shop →',
    ctaLink: '/shop',
    bgGradient: 'from-emerald-950/80 via-slate-900 to-slate-950',
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600',
  },
];

const initialTransactions: WalletTransaction[] = [
  {
    id: 'tx-1',
    referenceNumber: 'ADV-20260903-QP92',
    type: 'SALARY_ADVANCE',
    amount: 500.0,
    balanceBefore: 1000.0,
    balanceAfter: 1500.0,
    status: 'COMPLETED',
    description: 'Salary advance disbursed',
    createdAt: '2026-09-03T10:15:00Z',
  },
  {
    id: 'tx-2',
    referenceNumber: 'WDR-20260903-8K3D2',
    type: 'WITHDRAWAL',
    amount: 300.0,
    balanceBefore: 1500.0,
    balanceAfter: 1200.0,
    status: 'COMPLETED',
    description: 'Bank withdrawal to Maybank (*4821)',
    createdAt: '2026-09-03T14:30:00Z',
  },
  {
    id: 'tx-3',
    referenceNumber: 'GAM-20260902-LK20',
    type: 'GAMING_TOPUP',
    amount: 50.0,
    balanceBefore: 1050.0,
    balanceAfter: 1000.0,
    status: 'COMPLETED',
    description: 'Gaming Wallet Top Up',
    createdAt: '2026-09-02T19:45:00Z',
  },
  {
    id: 'tx-4',
    referenceNumber: 'GAM-20260902-CW91',
    type: 'GAMING_CASHOUT',
    amount: 75.0,
    balanceBefore: 975.0,
    balanceAfter: 1050.0,
    status: 'COMPLETED',
    description: 'Gaming Cash Out (Winnings)',
    createdAt: '2026-09-02T20:50:00Z',
  },
  {
    id: 'tx-5',
    referenceNumber: 'ADV-20260828-TR11',
    type: 'SALARY_ADVANCE',
    amount: 500.0,
    balanceBefore: 475.0,
    balanceAfter: 975.0,
    status: 'COMPLETED',
    description: 'Salary advance disbursed',
    createdAt: '2026-08-28T09:00:00Z',
  },
  {
    id: 'tx-6',
    referenceNumber: 'SHOP-20260825-MB88',
    type: 'SHOP_PAYMENT',
    amount: 45.0,
    balanceBefore: 520.0,
    balanceAfter: 475.0,
    status: 'COMPLETED',
    description: 'Shop purchase - Grocery Voucher',
    createdAt: '2026-08-25T16:20:00Z',
  },
];

const initialGameCategories: GameCategory[] = [
  { id: 'cat-1', name: 'All Games', slug: 'all', icon: 'Sparkles', sortOrder: 0 },
  { id: 'cat-2', name: 'Slots', slug: 'slots', icon: 'Flame', sortOrder: 1 },
  { id: 'cat-3', name: 'Crash', slug: 'crash', icon: 'Rocket', sortOrder: 2 },
  { id: 'cat-4', name: 'Live Casino', slug: 'live-casino', icon: 'Tv', sortOrder: 3 },
  { id: 'cat-5', name: 'Arcade', slug: 'arcade', icon: 'Gamepad2', sortOrder: 4 },
  { id: 'cat-6', name: 'Other', slug: 'other', icon: 'Dice5', sortOrder: 5 },
];

const initialGames: Game[] = [
  {
    id: 'g-1',
    name: 'Candy Fortune',
    slug: 'candy-fortune',
    category: 'Slots',
    categorySlug: 'slots',
    provider: 'SweetWorks Games',
    thumbnail: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=400',
    status: 'HOT',
    minBet: 1.0,
    maxBet: 500.0,
    isFeatured: true,
  },
  {
    id: 'g-2',
    name: 'Olympus Quest',
    slug: 'olympus-quest',
    category: 'Slots',
    categorySlug: 'slots',
    provider: 'Mythic Play',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
    status: 'POPULAR',
    minBet: 2.0,
    maxBet: 800.0,
    isFeatured: true,
  },
  {
    id: 'g-3',
    name: 'Sky Aviator',
    slug: 'sky-aviator',
    category: 'Crash',
    categorySlug: 'crash',
    provider: 'Velocity Tech',
    thumbnail: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400',
    status: 'HOT',
    minBet: 1.0,
    maxBet: 1000.0,
    isFeatured: true,
  },
  {
    id: 'g-4',
    name: 'Royal Baccarat',
    slug: 'royal-baccarat',
    category: 'Live Casino',
    categorySlug: 'live-casino',
    provider: 'Grand Studios',
    thumbnail: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=400',
    status: 'DEFAULT',
    minBet: 5.0,
    maxBet: 2000.0,
    isFeatured: false,
  },
  {
    id: 'g-5',
    name: 'Lucky Roulette',
    slug: 'lucky-roulette',
    category: 'Live Casino',
    categorySlug: 'live-casino',
    provider: 'Spin Palace Live',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400',
    status: 'POPULAR',
    minBet: 2.0,
    maxBet: 1500.0,
    isFeatured: true,
  },
  {
    id: 'g-6',
    name: 'Night Blackjack',
    slug: 'night-blackjack',
    category: 'Live Casino',
    categorySlug: 'live-casino',
    provider: 'Club Noir',
    thumbnail: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=400',
    status: 'NEW',
    minBet: 10.0,
    maxBet: 3000.0,
    isFeatured: false,
  },
  {
    id: 'g-7',
    name: 'Dragon Fortune',
    slug: 'dragon-fortune',
    category: 'Slots',
    categorySlug: 'slots',
    provider: 'Eastern Fortune',
    thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400',
    status: 'HOT',
    minBet: 1.0,
    maxBet: 600.0,
    isFeatured: true,
  },
  {
    id: 'g-8',
    name: 'Book of Gold',
    slug: 'book-of-gold',
    category: 'Slots',
    categorySlug: 'slots',
    provider: 'Pharaoh Gaming',
    thumbnail: 'https://images.unsplash.com/photo-1533158307587-828f0a76ef96?w=400',
    status: 'POPULAR',
    minBet: 1.0,
    maxBet: 500.0,
    isFeatured: false,
  },
  {
    id: 'g-9',
    name: 'Big Bass Adventure',
    slug: 'big-bass-adventure',
    category: 'Slots',
    categorySlug: 'slots',
    provider: 'Reel Wild',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
    status: 'DEFAULT',
    minBet: 2.0,
    maxBet: 700.0,
    isFeatured: false,
  },
  {
    id: 'g-10',
    name: 'Lucky Cat',
    slug: 'lucky-cat',
    category: 'Arcade',
    categorySlug: 'arcade',
    provider: 'Neko Arcade',
    thumbnail: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400',
    status: 'NEW',
    minBet: 0.5,
    maxBet: 200.0,
    isFeatured: false,
  },
  {
    id: 'g-11',
    name: 'Mines',
    slug: 'mines',
    category: 'Arcade',
    categorySlug: 'arcade',
    provider: 'Grid Logic',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    status: 'HOT',
    minBet: 1.0,
    maxBet: 1000.0,
    isFeatured: true,
  },
  {
    id: 'g-12',
    name: 'Plinko',
    slug: 'plinko',
    category: 'Arcade',
    categorySlug: 'arcade',
    provider: 'Drop Zone Games',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    status: 'POPULAR',
    minBet: 1.0,
    maxBet: 500.0,
    isFeatured: true,
  },
];

const initialProducts: Product[] = [
  {
    id: 'p-1',
    name: 'GrabFood RM50 Voucher',
    slug: 'grabfood-rm50',
    category: 'Vouchers & Gift Cards',
    categorySlug: 'vouchers',
    description: 'E-voucher valid for all GrabFood food and beverage orders across Malaysia.',
    shortDescription: 'RM50 E-Voucher for dining and grocery delivery.',
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
    price: 50.0,
    points: 500,
    stock: 120,
    isFeatured: true,
  },
  {
    id: 'p-2',
    name: 'Lotus Supermarket RM100 Voucher',
    slug: 'lotus-rm100',
    category: 'Vouchers & Gift Cards',
    categorySlug: 'vouchers',
    description: 'Digital gift voucher accepted at all Lotus hypermarkets for fresh groceries.',
    shortDescription: 'RM100 voucher for fresh groceries and items.',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400',
    price: 100.0,
    points: 1000,
    stock: 65,
    isFeatured: true,
  },
  {
    id: 'p-3',
    name: 'Wireless Bluetooth Earbuds Pro',
    slug: 'wireless-earbuds-pro',
    category: 'Electronics',
    categorySlug: 'electronics',
    description: 'High-fidelity audio with active noise cancelling, USB-C fast charge, and 24h battery life.',
    shortDescription: 'True wireless earbuds with ANC & long battery.',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
    price: 125.0,
    points: 1250,
    stock: 35,
    isFeatured: true,
  },
  {
    id: 'p-4',
    name: '20,000mAh Power Bank Fast Charge',
    slug: 'power-bank-20000mah',
    category: 'Electronics',
    categorySlug: 'electronics',
    description: 'Dual output fast-charging battery pack compatible with iPhone and Android devices.',
    shortDescription: 'High capacity portable charger with dual ports.',
    image: 'https://images.unsplash.com/photo-1609592424361-b4f7ceec7f21?w=400',
    price: 79.0,
    points: 790,
    stock: 45,
    isFeatured: false,
  },
  {
    id: 'p-5',
    name: 'Monthly Grocery Essentials Basket',
    slug: 'grocery-essentials-basket',
    category: 'Groceries & Essentials',
    categorySlug: 'essentials',
    description: 'Assorted daily essentials: 5kg premium rice, cooking oil, canned tuna, oats, and tea.',
    shortDescription: 'Comprehensive household grocery package.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    price: 85.0,
    points: 850,
    stock: 80,
    isFeatured: true,
  },
  {
    id: 'p-6',
    name: 'Smart Health Fitness Band',
    slug: 'smart-health-band',
    category: 'Lifestyle & Health',
    categorySlug: 'lifestyle',
    description: 'Step tracker, 24/7 heart rate monitor, sleep analysis, and water resistance.',
    shortDescription: 'Waterproof tracker for steps, sleep & pulse.',
    image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
    price: 99.0,
    points: 990,
    stock: 50,
    isFeatured: false,
  },
  {
    id: 'p-7',
    name: 'Thermal Steel Water Bottle 750ml',
    slug: 'thermal-water-bottle-750ml',
    category: 'Lifestyle & Health',
    categorySlug: 'lifestyle',
    description: 'Double-walled vacuum insulated stainless steel flask. Keeps beverages cold 24h / hot 12h.',
    shortDescription: '750ml double-walled insulated bottle.',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
    price: 38.0,
    points: 380,
    stock: 90,
    isFeatured: false,
  },
  {
    id: 'p-8',
    name: 'Touch n Go eWallet RM30 Reload PIN',
    slug: 'tng-rm30-pin',
    category: 'Vouchers & Gift Cards',
    categorySlug: 'vouchers',
    description: 'Instant reload PIN for your Touch n Go digital wallet for tolls, parking, and street merchants.',
    shortDescription: 'Instant RM30 reload PIN code.',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400',
    price: 30.0,
    points: 300,
    stock: 200,
    isFeatured: true,
  },
];

const initialNotifications: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Withdrawal Processed',
    message: 'MYR 300.00 withdrawal has been processed successfully to Maybank (*4821).',
    type: 'SUCCESS',
    isRead: false,
    createdAt: '2026-09-03T14:30:00Z',
  },
  {
    id: 'n-2',
    title: 'Salary Advance Disbursed',
    message: 'Your salary advance request of MYR 500.00 has been approved and credited to your wallet.',
    type: 'SUCCESS',
    isRead: false,
    createdAt: '2026-09-03T10:15:00Z',
  },
  {
    id: 'n-3',
    title: 'Gaming Wallet Top Up Successful',
    message: 'MYR 50.00 transferred from Main Wallet to Gaming Wallet.',
    type: 'INFO',
    isRead: true,
    createdAt: '2026-09-02T19:45:00Z',
  },
  {
    id: 'n-4',
    title: 'Gaming Cash Out Complete',
    message: 'MYR 75.00 winnings cashed out to Main Wallet.',
    type: 'SUCCESS',
    isRead: true,
    createdAt: '2026-09-02T20:50:00Z',
  },
  {
    id: 'n-5',
    title: 'Salary Advance Approved',
    message: 'Advance request #ADV-20260828-TR11 has been approved by Finance.',
    type: 'INFO',
    isRead: true,
    createdAt: '2026-08-28T09:00:00Z',
  },
  {
    id: 'n-6',
    title: 'Order Confirmed',
    message: 'Order #ORD-20260825-MB88 for Lotus Supermarket Voucher has been issued.',
    type: 'SUCCESS',
    isRead: true,
    createdAt: '2026-08-25T16:25:00Z',
  },
  {
    id: 'n-7',
    title: 'Monthly Pay Slip Generated',
    message: 'Your August salary statement is now available for review.',
    type: 'INFO',
    isRead: true,
    createdAt: '2026-08-31T18:00:00Z',
  },
  {
    id: 'n-8',
    title: 'Security Alert: New Device',
    message: 'Login detected from Mobile App on Android 15 (Kuala Lumpur, MY).',
    type: 'WARNING',
    isRead: true,
    createdAt: '2026-09-01T08:12:00Z',
  },
  {
    id: 'n-9',
    title: 'Welcome to WorkPay',
    message: 'Your workforce digital wallet has been activated. Enjoy zero-fee advances and perks.',
    type: 'INFO',
    isRead: true,
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'n-10',
    title: 'Weekend Gaming Tournament',
    message: 'Top the leaderboard in Sky Aviator this weekend and win up to MYR 1,000 in bonuses!',
    type: 'PROMO',
    isRead: false,
    createdAt: '2026-09-03T18:00:00Z',
  },
];

// In-memory state synchronized with localStorage
class LocalStore {
  wallet: Wallet;
  gamingWallet: GamingWallet;
  transactions: WalletTransaction[];
  notifications: NotificationItem[];
  orders: Order[];

  constructor() {
    const savedWallet = localStorage.getItem('workpay_wallet');
    this.wallet = savedWallet ? JSON.parse(savedWallet) : initialWallet;

    const savedGaming = localStorage.getItem('workpay_gaming_wallet');
    this.gamingWallet = savedGaming ? JSON.parse(savedGaming) : initialGamingWallet;

    const savedTxs = localStorage.getItem('workpay_transactions');
    this.transactions = savedTxs ? JSON.parse(savedTxs) : initialTransactions;

    const savedNotifs = localStorage.getItem('workpay_notifications');
    this.notifications = savedNotifs ? JSON.parse(savedNotifs) : initialNotifications;

    const savedOrders = localStorage.getItem('workpay_orders');
    this.orders = savedOrders ? JSON.parse(savedOrders) : [
      {
        id: 'ord-1',
        orderNumber: 'ORD-20260825-MB88',
        totalAmount: 45.0,
        paymentMethod: 'WALLET',
        status: 'DELIVERED',
        itemsCount: 1,
        items: [
          {
            productId: 'p-1',
            name: 'GrabFood RM50 Voucher',
            image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
            quantity: 1,
            price: 45.0,
            subtotal: 45.0,
          },
        ],
        createdAt: '2026-08-25T16:20:00Z',
      },
    ];
  }

  save() {
    localStorage.setItem('workpay_wallet', JSON.stringify(this.wallet));
    localStorage.setItem('workpay_gaming_wallet', JSON.stringify(this.gamingWallet));
    localStorage.setItem('workpay_transactions', JSON.stringify(this.transactions));
    localStorage.setItem('workpay_notifications', JSON.stringify(this.notifications));
    localStorage.setItem('workpay_orders', JSON.stringify(this.orders));
  }
}

export const localStore = new LocalStore();

// Universal API Client with automatic fallback to local store if backend server is unreachable
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('workpay_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as any) || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.ok) {
      const json = await res.json();
      return json.data as T;
    }
  } catch (error) {
    // Network failure / server not running: use instant simulated response
  }

  return fallbackLocalHandler(endpoint, options) as Promise<T>;
}

// Fallback handler providing 100% working interactions locally
async function fallbackLocalHandler(endpoint: string, options: RequestInit = {}): Promise<any> {
  const body = options.body ? JSON.parse(options.body as string) : {};

  if (endpoint === '/dashboard') {
    return {
      employee: initialEmployee,
      wallet: localStore.wallet,
      gamingWallet: localStore.gamingWallet,
      recentTransactions: localStore.transactions.slice(0, 5),
      banners: initialBanners,
      unreadNotifications: localStore.notifications.filter((n) => !n.isRead).length,
    };
  }

  if (endpoint === '/wallet') {
    return localStore.wallet;
  }

  if (endpoint.startsWith('/wallet/transactions')) {
    return localStore.transactions;
  }

  if (endpoint === '/salary') {
    const monthly = localStore.wallet.expectedMonthlySalary || 1500;
    const advances = localStore.wallet.totalAdvance;
    const available = Math.max(0, Math.min(500, monthly - advances));
    return {
      monthlySalary: monthly,
      availableAdvance: available,
      previouslyAdvanced: advances,
      earned: localStore.wallet.totalEarned,
      currency: 'MYR',
    };
  }

  if (endpoint === '/salary-advances' && options.method === 'POST') {
    const amount = Number(body.amount);
    localStore.wallet.availableBalance += amount;
    localStore.wallet.totalAdvance += amount;

    const ref = `ADV-20260909-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const tx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      referenceNumber: ref,
      type: 'SALARY_ADVANCE',
      amount,
      balanceBefore: localStore.wallet.availableBalance - amount,
      balanceAfter: localStore.wallet.availableBalance,
      status: 'COMPLETED',
      description: `Salary advance disbursed (${ref})`,
      createdAt: new Date().toISOString(),
    };
    localStore.transactions.unshift(tx);

    localStore.notifications.unshift({
      id: `n-${Date.now()}`,
      title: 'Salary Advance Disbursed',
      message: `Your advance of MYR ${amount.toFixed(2)} has been credited to your wallet balance.`,
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    localStore.save();
    return { referenceNumber: ref, amount, newAvailableBalance: localStore.wallet.availableBalance };
  }

  if (endpoint === '/withdrawals' && options.method === 'POST') {
    const amount = Number(body.amount);
    localStore.wallet.availableBalance -= amount;
    localStore.wallet.totalWithdrawn += amount;

    const ref = `WDR-20260909-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const tx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      referenceNumber: ref,
      type: 'WITHDRAWAL',
      amount,
      balanceBefore: localStore.wallet.availableBalance + amount,
      balanceAfter: localStore.wallet.availableBalance,
      status: 'COMPLETED',
      description: `Bank withdrawal to ${body.bankName || 'Bank'} (*${(body.accountNumber || '4821').slice(-4)})`,
      createdAt: new Date().toISOString(),
    };
    localStore.transactions.unshift(tx);

    localStore.notifications.unshift({
      id: `n-${Date.now()}`,
      title: 'Withdrawal Processed',
      message: `MYR ${amount.toFixed(2)} withdrawal has been processed successfully to ${body.bankName || 'Bank'}.`,
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    localStore.save();
    return { referenceNumber: ref, amount, newAvailableBalance: localStore.wallet.availableBalance };
  }

  if (endpoint === '/gaming-wallet') {
    return localStore.gamingWallet;
  }

  if (endpoint === '/gaming-wallet/top-up' && options.method === 'POST') {
    const amount = Number(body.amount);
    localStore.wallet.availableBalance -= amount;
    localStore.gamingWallet.balance += amount;

    const ref = `GAM-20260909-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    localStore.transactions.unshift({
      id: `tx-${Date.now()}`,
      referenceNumber: ref,
      type: 'GAMING_TOPUP',
      amount,
      balanceBefore: localStore.wallet.availableBalance + amount,
      balanceAfter: localStore.wallet.availableBalance,
      status: 'COMPLETED',
      description: `Gaming Wallet Top Up (${ref})`,
      createdAt: new Date().toISOString(),
    });

    localStore.notifications.unshift({
      id: `n-${Date.now()}`,
      title: 'Gaming Wallet Top Up Successful',
      message: `MYR ${amount.toFixed(2)} transferred from Main Wallet to Gaming Wallet.`,
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    localStore.save();
    return {
      referenceNumber: ref,
      mainWalletBalance: localStore.wallet.availableBalance,
      gamingWalletBalance: localStore.gamingWallet.balance,
    };
  }

  if (endpoint === '/gaming-wallet/cash-out' && options.method === 'POST') {
    const amount = Number(body.amount);
    localStore.gamingWallet.balance -= amount;
    localStore.wallet.availableBalance += amount;

    const ref = `GAM-20260909-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    localStore.transactions.unshift({
      id: `tx-${Date.now()}`,
      referenceNumber: ref,
      type: 'GAMING_CASHOUT',
      amount,
      balanceBefore: localStore.wallet.availableBalance - amount,
      balanceAfter: localStore.wallet.availableBalance,
      status: 'COMPLETED',
      description: `Gaming Cash Out (${ref})`,
      createdAt: new Date().toISOString(),
    });

    localStore.notifications.unshift({
      id: `n-${Date.now()}`,
      title: 'Gaming Cash Out Complete',
      message: `MYR ${amount.toFixed(2)} winnings cashed out to Main Wallet.`,
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    localStore.save();
    return {
      referenceNumber: ref,
      mainWalletBalance: localStore.wallet.availableBalance,
      gamingWalletBalance: localStore.gamingWallet.balance,
    };
  }

  if (endpoint === '/games') {
    return initialGames;
  }

  if (endpoint === '/game-categories') {
    return initialGameCategories;
  }

  if (endpoint === '/products') {
    return initialProducts;
  }

  if (endpoint === '/orders' && options.method === 'POST') {
    const items = body.items || [];
    let total = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const prod = initialProducts.find((p) => p.id === item.productId) || initialProducts[0];
      const subtotal = prod.price * item.quantity;
      total += subtotal;
      orderItems.push({
        productId: prod.id,
        name: prod.name,
        image: prod.image,
        quantity: item.quantity,
        price: prod.price,
        subtotal,
      });
    }

    localStore.wallet.availableBalance -= total;
    const orderNum = `ORD-20260909-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      totalAmount: total,
      paymentMethod: 'WALLET',
      status: 'PROCESSING',
      itemsCount: items.length,
      items: orderItems,
      createdAt: new Date().toISOString(),
    };

    localStore.orders.unshift(newOrder);

    localStore.transactions.unshift({
      id: `tx-${Date.now()}`,
      referenceNumber: `SHOP-${Date.now()}`,
      type: 'SHOP_PAYMENT',
      amount: total,
      balanceBefore: localStore.wallet.availableBalance + total,
      balanceAfter: localStore.wallet.availableBalance,
      status: 'COMPLETED',
      description: `Shop purchase - Order #${orderNum}`,
      createdAt: new Date().toISOString(),
    });

    localStore.notifications.unshift({
      id: `n-${Date.now()}`,
      title: 'Order Confirmed',
      message: `Your order #${orderNum} for MYR ${total.toFixed(2)} has been placed.`,
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    localStore.save();
    return newOrder;
  }

  if (endpoint === '/orders') {
    return localStore.orders;
  }

  if (endpoint.startsWith('/notifications')) {
    if (endpoint === '/notifications/read-all') {
      localStore.notifications.forEach((n) => (n.isRead = true));
      localStore.save();
      return null;
    }
    return {
      unreadCount: localStore.notifications.filter((n) => !n.isRead).length,
      notifications: localStore.notifications,
    };
  }

  if (endpoint === '/auth/me') {
    return {
      id: 'usr-001',
      mobile: '+60123456789',
      email: 'john.doe@workforce.com',
      role: 'EMPLOYEE',
      employee: initialEmployee,
      wallet: localStore.wallet,
      gamingWallet: localStore.gamingWallet,
    };
  }

  return null;
}
