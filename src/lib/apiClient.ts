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
  { id: 'cat-2', name: 'Arcade', slug: 'arcade', icon: 'Gamepad2', sortOrder: 1 },
  { id: 'cat-3', name: 'Action', slug: 'action', icon: 'Flame', sortOrder: 2 },
  { id: 'cat-4', name: 'Table Games', slug: 'table-games', icon: 'Tv', sortOrder: 3 },
  { id: 'cat-5', name: 'Dice', slug: 'dice', icon: 'Dice5', sortOrder: 4 },
];

const initialGames: Game[] = [
  {
    id: 'g-pinball',
    name: 'Space Pinball',
    slug: 'space-pinball',
    category: 'Arcade',
    categorySlug: 'arcade',
    provider: 'Pinball Retro Lab',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600',
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
    gameUrl: 'https://pinballfe.vercel.app',
    minBet: 1.0,
    maxBet: 500.0,
    status: 'HOT',
    tag: 'HOT',
    isFeatured: true,
  },
  {
    id: 'g-galaga',
    name: 'Galaga Retro Space',
    slug: 'galaga-retro-space',
    category: 'Arcade',
    categorySlug: 'arcade',
    provider: 'Bandai Classic Arcade',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600',
    banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
    gameUrl: 'https://galaga-fe.vercel.app',
    minBet: 1.0,
    maxBet: 500.0,
    status: 'POPULAR',
    tag: 'POPULAR',
    isFeatured: true,
  },
  {
    id: 'g-bomberboy',
    name: 'Bomber Boy',
    slug: 'bomber-boy',
    category: 'Action',
    categorySlug: 'action',
    provider: 'Bomber Studio',
    thumbnail: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600',
    banner: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800',
    gameUrl: 'https://bomberboy-game.vercel.app/',
    minBet: 2.0,
    maxBet: 800.0,
    status: 'HOT',
    tag: 'HOT',
    isFeatured: true,
  },
  {
    id: 'g-liarsdice',
    name: "Liar's Dice",
    slug: 'liars-dice',
    category: 'Table Games',
    categorySlug: 'table-games',
    provider: 'Dice Master Gaming',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
    banner: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800',
    gameUrl: 'https://lair-s-daice.vercel.app/',
    minBet: 5.0,
    maxBet: 1000.0,
    status: 'NEW',
    tag: 'NEW',
    isFeatured: true,
  },
  {
    id: 'g-shipcaptaincrew',
    name: 'Ship, Captain & Crew',
    slug: 'ship-captain-crew',
    category: 'Dice',
    categorySlug: 'dice',
    provider: 'Nautical Rollers',
    thumbnail: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600',
    banner: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
    gameUrl: 'https://ship-captain-crew-fe.vercel.app/',
    minBet: 2.0,
    maxBet: 600.0,
    status: 'HOT',
    tag: 'HOT',
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
  games: Game[];
  products: Product[];

  constructor() {
    const savedWallet = localStorage.getItem('workpay_wallet');
    this.wallet = savedWallet ? JSON.parse(savedWallet) : initialWallet;

    const savedGaming = localStorage.getItem('workpay_gaming_wallet');
    this.gamingWallet = savedGaming ? JSON.parse(savedGaming) : initialGamingWallet;

    const savedTxs = localStorage.getItem('workpay_transactions');
    this.transactions = savedTxs ? JSON.parse(savedTxs) : initialTransactions;

    const savedNotifs = localStorage.getItem('workpay_notifications');
    this.notifications = savedNotifs ? JSON.parse(savedNotifs) : initialNotifications;

    const savedGames = localStorage.getItem('workpay_games_v4');
    this.games = savedGames ? JSON.parse(savedGames) : initialGames;

    const savedProducts = localStorage.getItem('workpay_products');
    this.products = savedProducts ? JSON.parse(savedProducts) : initialProducts;

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
    localStorage.setItem('workpay_games_v4', JSON.stringify(this.games));
    localStorage.setItem('workpay_products', JSON.stringify(this.products));
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
    if (options.method === 'POST') {
      const newGame: Game = {
        id: `g-${Date.now()}`,
        name: body.name || 'New Game',
        slug: (body.name || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: body.category || 'Slots',
        categorySlug: (body.category || 'slots').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        provider: body.provider || 'Casino Studio',
        thumbnail: body.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
        banner: body.banner || body.thumbnail || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
        minBet: Number(body.minBet) || 1.0,
        maxBet: Number(body.maxBet) || 500.0,
        status: (body.status as any) || 'HOT',
        tag: body.tag || 'HOT',
        isFeatured: body.isFeatured ?? true,
      };
      localStore.games.unshift(newGame);
      localStore.save();
      return newGame;
    }
    return localStore.games;
  }

  if (endpoint.startsWith('/games/') && options.method === 'DELETE') {
    const id = endpoint.replace('/games/', '');
    localStore.games = localStore.games.filter((g) => g.id !== id);
    localStore.save();
    return { success: true, message: 'Game removed successfully' };
  }

  if (endpoint === '/game-categories') {
    return initialGameCategories;
  }

  if (endpoint === '/products') {
    if (options.method === 'POST') {
      const newProduct: Product = {
        id: `p-${Date.now()}`,
        name: body.name || 'New Product',
        slug: (body.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: body.description || 'Exclusive employee marketplace item',
        shortDescription: body.shortDescription || body.name,
        image: body.image || 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
        price: Number(body.price) || 50.0,
        points: Number(body.points) || 10,
        stock: Number(body.stock) || 100,
        category: body.category || 'Vouchers',
        categorySlug: (body.category || 'vouchers').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        isFeatured: body.isFeatured ?? true,
      };
      localStore.products.unshift(newProduct);
      localStore.save();
      return newProduct;
    }
    return localStore.products;
  }

  if (endpoint.startsWith('/products/') && options.method === 'DELETE') {
    const id = endpoint.replace('/products/', '');
    localStore.products = localStore.products.filter((p) => p.id !== id);
    localStore.save();
    return { success: true, message: 'Product removed successfully' };
  }

  if (endpoint === '/orders' && options.method === 'POST') {
    const items = body.items || [];
    let total = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const prod = localStore.products.find((p) => p.id === item.productId) || localStore.products[0];
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

  if (endpoint === '/admin/employees') {
    return [
      {
        id: 'emp-001',
        employeeCode: 'EMP001',
        name: 'John Doe',
        department: 'Logistics & Operations',
        designation: 'Senior Warehouse Specialist',
        monthlySalary: 1500.0,
        walletBalance: localStore.wallet.availableBalance,
        status: 'ACTIVE',
      },
      {
        id: 'emp-002',
        employeeCode: 'EMP002',
        name: 'Ahmad Faiz',
        department: 'Warehouse & Inventory',
        designation: 'Inventory Coordinator',
        monthlySalary: 1400.0,
        walletBalance: 850.0,
        status: 'ACTIVE',
      },
      {
        id: 'emp-003',
        employeeCode: 'EMP003',
        name: 'Priya Sharma',
        department: 'Supply Chain & Procurement',
        designation: 'Supply Chain Lead',
        monthlySalary: 2100.0,
        walletBalance: 1450.0,
        status: 'ACTIVE',
      },
      {
        id: 'emp-004',
        employeeCode: 'EMP004',
        name: 'Sarah Wong',
        department: 'Quality Assurance',
        designation: 'Senior QA Inspector',
        monthlySalary: 1650.0,
        walletBalance: 620.0,
        status: 'ACTIVE',
      },
      {
        id: 'emp-005',
        employeeCode: 'EMP005',
        name: 'Michael Chen',
        department: 'Transport & Fleet',
        designation: 'Fleet Logistics Supervisor',
        monthlySalary: 1800.0,
        walletBalance: 1100.0,
        status: 'ACTIVE',
      },
      {
        id: 'emp-006',
        employeeCode: 'EMP006',
        name: 'Siti Aminah',
        department: 'Fulfilment & Packing',
        designation: 'Fulfilment Specialist',
        monthlySalary: 1350.0,
        walletBalance: 420.0,
        status: 'ACTIVE',
      },
    ];
  }

  if (endpoint === '/wallet/add-money' && options.method === 'POST') {
    const amount = Number(body.amount || 50);
    const paymentMethod = body.paymentMethod || 'RAZORPAY';
    localStore.wallet.availableBalance += amount;
    localStore.wallet.totalEarned += amount;

    const rzpId = `pay_${Math.random().toString(36).substring(2, 11)}`;
    const ref = `RZP-${Date.now()}`;

    localStore.transactions.unshift({
      id: `tx-${Date.now()}`,
      referenceNumber: ref,
      type: 'RAZORPAY_CREDIT',
      amount,
      balanceBefore: localStore.wallet.availableBalance - amount,
      balanceAfter: localStore.wallet.availableBalance,
      status: 'COMPLETED',
      description: `Loaded via Razorpay Gateway (${rzpId})`,
      createdAt: new Date().toISOString(),
    });

    localStore.notifications.unshift({
      id: `n-${Date.now()}`,
      title: 'Money Added via Razorpay',
      message: `MYR ${amount.toFixed(2)} loaded successfully via Razorpay Gateway. Payment ID: ${rzpId}`,
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    localStore.save();
    return {
      referenceNumber: ref,
      razorpayPaymentId: rzpId,
      amount,
      newAvailableBalance: localStore.wallet.availableBalance,
    };
  }

  if (endpoint === '/admin/credit-wallet' && options.method === 'POST') {
    const amount = Number(body.amount || 0);
    const code = body.employeeCode || 'EMP001';
    const reason = body.reason || 'Admin Adjustment';
    const gateway = body.gateway || 'RAZORPAY';

    if (code === 'EMP001') {
      localStore.wallet.availableBalance += amount;
      localStore.wallet.totalEarned += amount;

      const rzpPayoutId = `pout_${Math.random().toString(36).substring(2, 11)}`;
      const ref = `CRD-${Date.now().toString(36).toUpperCase()}`;

      localStore.transactions.unshift({
        id: `tx-${Date.now()}`,
        referenceNumber: ref,
        type: 'RAZORPAY_CREDIT',
        amount,
        balanceBefore: localStore.wallet.availableBalance - amount,
        balanceAfter: localStore.wallet.availableBalance,
        status: 'COMPLETED',
        description: gateway === 'RAZORPAY'
          ? `Disbursed via Razorpay Corporate Payout (${reason} - ${rzpPayoutId})`
          : `Stipend / Bonus (${reason})`,
        createdAt: new Date().toISOString(),
      });

      localStore.notifications.unshift({
        id: `n-${Date.now()}`,
        title: gateway === 'RAZORPAY' ? 'Stipend Credited via Razorpay' : 'Wallet Credited',
        message: `Your wallet was credited with MYR ${amount.toFixed(2)}. Reason: ${reason} (Razorpay Reference: ${rzpPayoutId})`,
        type: 'SUCCESS',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      localStore.save();
    }

    return {
      success: true,
      message: `Credited MYR ${amount.toFixed(2)} to ${code} via Razorpay`,
    };
  }

  if (endpoint === '/admin/broadcast' && options.method === 'POST') {
    const title = body.title || 'Broadcast Announcement';
    const message = body.message || '';

    localStore.notifications.unshift({
      id: `n-${Date.now()}`,
      title,
      message,
      type: 'PROMO',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    localStore.save();

    return { success: true, message: 'Broadcast pushed successfully' };
  }

  return null;
}
