export interface User {
  id: string;
  mobile: string;
  email?: string | null;
  role: 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  employee?: Employee | null;
  wallet?: Wallet | null;
  gamingWallet?: GamingWallet | null;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  name?: string;
  monthlySalary: number;
  joiningDate?: string;
  department?: string;
  designation?: string;
  profileImage?: string | null;
}

export interface Wallet {
  currency: string;
  availableBalance: number;
  totalEarned: number;
  totalAdvance: number;
  totalWithdrawn: number;
  expectedMonthlySalary?: number;
}

export interface GamingWallet {
  currency: string;
  balance: number;
}

export interface WalletTransaction {
  id: string;
  referenceNumber: string;
  type:
    | 'SALARY_CREDIT'
    | 'SALARY_ADVANCE'
    | 'WITHDRAWAL'
    | 'REMITTANCE'
    | 'SHOP_PAYMENT'
    | 'REFUND'
    | 'GAMING_TOPUP'
    | 'GAMING_CASHOUT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  description?: string;
  createdAt: string;
}

export interface GameCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  provider: string;
  thumbnail: string;
  banner?: string;
  minBet: number;
  maxBet: number;
  status: 'HOT' | 'NEW' | 'POPULAR' | 'DEFAULT';
  tag?: string;
  isFeatured: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  image: string;
  price: number;
  points?: number;
  stock: number;
  category: string;
  categorySlug: string;
  isFeatured: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentMethod: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  itemsCount: number;
  items: Array<{
    productId: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  tag?: string;
  ctaText: string;
  ctaLink: string;
  bgGradient?: string;
  image?: string;
}
